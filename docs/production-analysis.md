# FightScope production data + jobs

## Supabase

1. Create a Supabase project.
2. Run `supabase/migrations/20260827_fight_analyses.sql` in the SQL editor.
3. Set Netlify / local env:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose to the browser)
   - `CRON_SECRET`
   - optional `OPENAI_API_KEY`

Tables:
- `fight_analyses` — shared analyses (`unique(matchup_key, engine_version)`)
- `analysis_runs` — generation / cron audit log
- `fighter_stat_snapshots` — prediction-relevant hashes for smart invalidation
- `analysis_model_meta` — engine/prompt version registry

## Netlify schedules (UTC)

| Function | Cron | Job |
|---|---|---|
| `cron-upcoming-events` | `0 3 * * *` daily | upcoming events refresh |
| `cron-weekly-roster` | `0 4 * * 0` weekly | full roster refresh |
| `cron-upcoming-fighters` | `0 5 * * *` daily | stats for upcoming fighters only |
| `cron-near-7d` | `0 */6 * * *` every 6h | events within 7 days |
| `cron-near-24h` | `20 */2 * * *` every 2h | events within 24 hours |
| `cron-post-event` | `30 */6 * * *` every 6h | recent results + invalidation |
| `cron-stale-sweep` | `0 6 * * *` daily | hash sync + upcoming precompute |

Each scheduled function POSTs to `/api/jobs/run` with `Authorization: Bearer $CRON_SECRET`.

## Concurrency

`INSERT ... unique(matchup_key, engine_version)` claims `status=generating`.
Losers wait for `ready`. Stale/failed/expired claims are reclaimed with compare-and-swap on `(status, input_hash)`.

## Local verification

```bash
npm run test:analysis
npm run test:production-cache
```

With Supabase env set, the production selftest also verifies concurrent single-row generation.
