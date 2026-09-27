# FightScope Prediction Engine

## Architecture (v4)

```
DATA (versioned local snapshot.json only for backtests)
  → as-of fighter snapshot (pre-fight only; careerRecordAsOf)
  → feature engineering (+ interactions, time-decay form)
  → submodels: Elo (strength) · matchup logit · recent form
  → ensemble + modelAgreement
  → joint 7-way softmax (A/B × KO/SUB/DEC + draw)
  → coverage shrink + reliability shrink
  → Platt calibration (winner margin)
  → structured EnginePrediction
  → Claude narrative ONLY (Pro) — never changes numbers
```

## Versions

| Stamp | Current |
|---|---|
| `predictionModelVersion` | `prediction_engine_v4` |
| `featureSchemaVersion` | `features_v4` |
| `calibrationVersion` | `platt_temp_v1` |
| `methodModelVersion` | `joint_softmax_v4` |
| `dataSnapshotVersion` | `catalog_asof_v1` |
| Analysis cache key | `fs-analysis-v4-calibrated` |

## What Claude may / may not do

**May:** explain locked probabilities, summarize topFactors, note weak coverage.

**Must not:** change win%, methods, joint outcomes, reliability, model scores, or invent stats/factors.

## Decision bias fix

v3 boosted Decision logits (`decisionPull × 1.15`, `priorDec × 1.35`) and used Decision-heavy defaults (46%).  
v4 uses equal win-channel weights, corpus-matched priors (~50% KO / 29% SUB / 21% DEC), and no longer folds draw mass into Decision.

## Overconfidence / calibration

- Ensemble disagreement lowers reliability.
- Low fight sample lowers reliability.
- Reliability shrinks logits toward 50/50.
- Temperature + coverage shrink fitted on validation.
- Platt scaling fitted on validation only (never test).

### Why ECE can look worse than v3

v3 used higher temperature (~1.15) and stronger coverage shrink (~0.70), which pulls probabilities toward 50/50 and lowers Expected Calibration Error.  
v4’s validation search often selects a lower temperature (sharper) and weaker shrink; combined with Platt on a small val set and Decision de-biasing, mid-confidence buckets can drift — **higher ECE even when Brier/logloss improve**. Promotion gates on Brier, log loss, **and** ECE vs Elo + as-of record baselines.

## Historical data limitations

Winner labels: ~400 matched `recentFights` pairs (2019–2026).  
Method labels: ~97 catalog completed fights (joined onto recent where possible) — still limited; test holdout is 35% chrono.  
Do not claim accuracy from smoke-test cards (Paris / Noche / UFC 331).

## Promotion gates

`prediction_engine_v4` is **not** written to `production.json` unless the candidate beats **both** Elo-only and as-of record baselines on **Brier, log loss, and ECE**. Accuracy is informational only. Failed runs write `artifacts/candidate-*.json`.

## Commands

```bash
npm run fightscope:backtest   # chrono split, fit, reports, gated artifact
npm run test:prediction       # contract + leakage selftests
```

Reports land in `reports/fightscope/<modelVersion>/…` and `reports/backtest/…`.  
Production artifact: `src/server/prediction/artifacts/production.json` (only when gates pass).

## Anti-leakage

`fighterAsOf(date)` strips future `recentFights` and reconstructs career totals via `careerRecordAsOf`.  
Baselines (`recordWinRateAsOf`, `preFightForm3`, Elo `ratingsBefore`) use the same as-of discipline.  
The ~84% “record” figure was a **leaky** post-fight career total — removed.  
Elo uses `ratingsBefore(date)`.  
Career rate stats may still partially leak under as-of; coverage/reliability down-weight them.

## Reproducibility / ESPN timeout

Backtests read **only** `src/server/mma/snapshot.json` (hashed in reports). They never hit ESPN.  
Live app catalog (`getCatalog`) may race ESPN with a 28s timeout and fall back to the same snapshot — that path is unrelated to backtest reproducibility.

## History immutability

Saved analyses store frozen prediction blobs + model versions.  
Engine upgrades do **not** rewrite History. New analyses get new versions.
