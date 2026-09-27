-- FightScope user entitlements (Stripe ↔ Supabase)
-- Apply via Supabase SQL editor or `supabase db push`.

create table if not exists public.user_entitlements (
  user_id text primary key,
  email text,
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
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists user_entitlements_customer_idx
  on public.user_entitlements (stripe_customer_id);

create index if not exists user_entitlements_plan_idx
  on public.user_entitlements (plan, subscription_status);
