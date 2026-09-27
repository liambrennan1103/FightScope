# FightScope — Netlify deployment

## Build
- Framework: Next.js (Netlify Next runtime / plugin)
- Build command: `npm run build`
- Publish: handled by Next runtime
- Node: 20+ recommended

## Environment variables (Netlify UI → Site settings → Environment)

### Required (production)
| Variable | Public? | Notes |
|---|---|---|
| `AUTH_SECRET` | No | `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical https URL, no trailing slash |
| `SUPABASE_URL` | No* | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service role — never `NEXT_PUBLIC_` |
| `STRIPE_SECRET_KEY` | No | Live or test secret |
| `STRIPE_WEBHOOK_SECRET` | No | From Stripe webhook endpoint |
| `STRIPE_PRICE_STARTER` | No | Price ID for Starter |
| `STRIPE_PRICE_PRO` | No | Price ID for Pro |
| `CRON_SECRET` | No | Scheduled job auth |

\*URL is not secret but keep service role server-only.

### Optional
| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | LLM narrative rewrite |
| `STRIPE_PRICE_*_LEGACY` | Comma-separated old price IDs |
| `FIGHTSCOPE_DEV_PLAN` | Never set in production |
| `FIGHTSCOPE_ALLOW_DEV_PLAN` | Never set in production (non-secret flag; if present, Netlify omits it from secrets scan via `SECRETS_SCAN_OMIT_KEYS`) |

## Secrets scanning (Netlify)

Netlify scans **env var values** in the repo + build output.

- `FIGHTSCOPE_ALLOW_DEV_PLAN` is often `1` — that value appears everywhere and is a **false positive**. Omitted in `netlify.toml` via `SECRETS_SCAN_OMIT_KEYS`.
- Real secrets (`AUTH_SECRET`, `ANTHROPIC_API_KEY`, `SUPABASE_SECRET_KEY`, Stripe, `CRON_SECRET`) are read with **dynamic** `process.env[name]` / `readServerEnv()` so Next does not statically inline them into client bundles. `.next/cache` is omitted from the scan path list (not published).
- **Do not** add real credential keys to `SECRETS_SCAN_OMIT_KEYS` unless deploy logs prove the hit is only in server/cache artifacts with zero client exposure.
- After changing secret handling, use **Clear cache and retry** on Netlify once.

## Stripe webhook
1. Create endpoint: `https://<your-domain>/api/billing/webhook`
2. Events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
3. Paste signing secret into `STRIPE_WEBHOOK_SECRET`
4. Enable Customer Portal in Stripe Dashboard (for Manage billing)

## Supabase
Apply migrations in order:
1. `supabase/migrations/20260827_fight_analyses.sql`
2. `supabase/migrations/20260318_user_entitlements.sql`

## Callbacks
Checkout success/cancel and portal return URLs are derived from `NEXT_PUBLIC_SITE_URL`
(or Netlify `URL` / `DEPLOY_PRIME_URL`).

## Entitlement model
- Free: browse only — Analyze Fight returns HTTP 402
- Starter: starter analysis payload only
- Pro: full analysis payload
- Source of truth: Stripe webhooks → `user_entitlements` (Supabase) + local `.data/entitlements.json` fallback
