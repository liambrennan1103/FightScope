-- FightScope production analysis persistence (Supabase)
-- Apply via Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto;

-- Per-fighter prediction-relevant snapshot hashes (smart invalidation).
create table if not exists public.fighter_stat_snapshots (
  fighter_id text primary key,
  input_hash text not null,
  statistics jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  record jsonb not null default '{}'::jsonb,
  finishes jsonb not null default '{}'::jsonb,
  recent_fights jsonb not null default '[]'::jsonb,
  ranking jsonb,
  age integer,
  reach_cm integer,
  data_quality text not null check (data_quality in ('HIGH', 'MEDIUM', 'LOW')),
  source text not null default 'espn-ufc',
  updated_at timestamptz not null default now()
);

create index if not exists fighter_stat_snapshots_updated_idx
  on public.fighter_stat_snapshots (updated_at desc);

-- Canonical persisted fight analyses (shared across users / function instances).
create table if not exists public.fight_analyses (
  id uuid primary key default gen_random_uuid(),
  matchup_key text not null,
  fighter_a_id text not null,
  fighter_b_id text not null,
  fighter_low_id text not null,
  fighter_high_id text not null,
  rounds smallint not null default 3,
  is_title boolean not null default false,
  division text,
  engine_version text not null,
  prompt_version text not null,
  ai_version text,
  input_hash text not null,
  fighter_a_hash text not null,
  fighter_b_hash text not null,
  structured_prediction jsonb not null default '{}'::jsonb,
  written_analysis jsonb not null default '{}'::jsonb,
  explanation_source text not null check (explanation_source in ('llm', 'template', 'none')),
  data_quality text not null check (data_quality in ('HIGH', 'MEDIUM', 'LOW')),
  status text not null check (status in ('generating', 'ready', 'stale', 'failed')),
  error_message text,
  generated_at timestamptz,
  claimed_at timestamptz,
  claim_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fight_analyses_matchup_version_uidx unique (matchup_key, engine_version)
);

create index if not exists fight_analyses_status_idx
  on public.fight_analyses (status, updated_at desc);

create index if not exists fight_analyses_fighters_idx
  on public.fight_analyses (fighter_low_id, fighter_high_id);

-- Audit / run history for generations and scheduled jobs.
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  matchup_key text,
  fight_analysis_id uuid references public.fight_analyses (id) on delete set null,
  run_type text not null check (
    run_type in (
      'generate',
      'regenerate',
      'precompute',
      'invalidate',
      'scheduled_refresh',
      'cache_hit'
    )
  ),
  trigger_source text not null default 'api',
  engine_version text,
  status text not null check (status in ('started', 'succeeded', 'failed', 'skipped')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analysis_runs_created_idx
  on public.analysis_runs (created_at desc);

create index if not exists analysis_runs_matchup_idx
  on public.analysis_runs (matchup_key, created_at desc);

-- Model / job metadata registry.
create table if not exists public.analysis_model_meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.analysis_model_meta (key, value)
values
  (
    'engine',
    jsonb_build_object(
      'engine_version', 'fs-analysis-v1',
      'prompt_version', 'fs-explain-v1',
      'notes', 'Deterministic FightScope engine + optional LLM rewrite'
    )
  )
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

-- Service-role only (no anon policies). Enable RLS and deny public.
alter table public.fighter_stat_snapshots enable row level security;
alter table public.fight_analyses enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.analysis_model_meta enable row level security;
