# Supabase setup (FightScope)

## Env vars (`.env.local` / Netlify)

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + server | Publishable / anon key (`sb_publishable_…` or legacy `eyJ…` anon JWT) |
| `SUPABASE_SECRET_KEY` | Server only | Service-role / secret key (`sb_secret_…` or legacy service_role JWT) |

**Do not** put the secret key in any `NEXT_PUBLIC_*` variable.
**Do not** paste the publishable key into `SUPABASE_SECRET_KEY` — admin features will refuse it.

## Apply migrations

In the Supabase SQL editor (or `supabase db push`), run in order:

1. `supabase/migrations/20260827_fight_analyses.sql` (analysis cache — optional for Auth)
2. `supabase/migrations/20260318_user_entitlements.sql` (legacy entitlements)
3. `supabase/migrations/20260918_profiles.sql` (**required** for Auth profiles + RLS)

## Auth model

When public Supabase env is set, sign-up / sign-in / sign-out use **Supabase Auth**.
FightScope still sets a lightweight `fs_session` cookie for compatibility with existing route protection.
`getSession()` prefers the Supabase user, then falls back to `fs_session`.

## Verify

```bash
curl -s http://localhost:3000/api/supabase/health | jq
```

Expect `ok: true`, `browserConfigured: true`, and after applying profiles migration `profilesTable.reachable: true`.

## Local / sandbox checklist

1. **Secret key** — In Supabase → Project Settings → API Keys, copy the **secret** / service-role key into `SUPABASE_SECRET_KEY`.  
   It must **not** be the same value as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. **Confirm email** — For local testing, Authentication → Providers → Email → disable “Confirm email” (or confirm via inbox).
3. **Run** `20260918_profiles.sql` in the SQL editor.
4. Sign up at `/sign-up`, refresh `/app`, open Account, then sign out.