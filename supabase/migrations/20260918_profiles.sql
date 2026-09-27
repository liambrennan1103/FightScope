-- FightScope profiles (Supabase Auth ↔ plan / Stripe metadata)
-- Apply via Supabase SQL editor or `supabase db push`.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'pro')),
  subscription_status text not null default 'none'
    check (
      subscription_status in (
        'none',
        'active',
        'trialing',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'paused'
      )
    ),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_plan_idx
  on public.profiles (plan, subscription_status);

create index if not exists profiles_customer_idx
  on public.profiles (stripe_customer_id);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No direct client inserts — profile rows are created by trigger below.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- Align existing entitlements table with RLS if present (server/service role bypasses RLS).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_entitlements'
  ) then
    execute 'alter table public.user_entitlements enable row level security';
    execute 'drop policy if exists "entitlements_select_own" on public.user_entitlements';
    -- user_id is text in the legacy table; only allow when it matches auth.uid()::text
    execute $p$
      create policy "entitlements_select_own"
        on public.user_entitlements
        for select
        to authenticated
        using (user_id = auth.uid()::text)
    $p$;
  end if;
end $$;
