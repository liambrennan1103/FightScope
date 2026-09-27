# FightScope — local plan testing

Switch Free / Starter / Pro **without** touching production billing.

## Recommended (fixed override)

In `.env.local`:

```bash
FIGHTSCOPE_ALLOW_DEV_PLAN=1
FIGHTSCOPE_DEV_PLAN=starter
```

Values: `free` | `starter` | `pro`

Restart the Next server after changing the env value.

`FIGHTSCOPE_ALLOW_DEV_PLAN=1` is required when using `next start` (NODE_ENV=production locally).
It is ignored as a security boundary on real deployed production if you simply omit the flag.

## Alternate (Account UI)

With `FIGHTSCOPE_ALLOW_DEV_PLAN=1` (and no forced `FIGHTSCOPE_DEV_PLAN`), open **Account** and click Free / Starter / Pro.

This sets an httpOnly `fs_dev_plan` cookie used by the analysis API.

## Security notes

- Client query params like `?plan=pro` never unlock access.
- The analysis API resolves plan **server-side only**.
- Production (without `FIGHTSCOPE_ALLOW_DEV_PLAN`) currently defaults to **free** until Stripe/user billing is wired.
