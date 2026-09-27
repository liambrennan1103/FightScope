/**
 * FightScope data availability (ESPN UFC sources).
 *
 * AVAILABLE (ingested / derived from ESPN):
 * - Physical: age, heightCm, reachCm, stance
 * - Career: W-L-D, TKO wins/losses, submission wins/losses, title fight counts (from records)
 * - Recent fights: opponent, result, method, round, time, date, event (history + scoreboard)
 * - Per-fight striking/clinch/ground tables (fighter stats page `__espnfitt__`)
 * - Aggregated rates when fight minutes are known:
 *   - sigStrikesLandedPerMin (SLpM)
 *   - sigStrikeAccuracy
 *   - knockdownsPer15
 *   - takedownsPer15
 *   - takedownAccuracy
 *   - submissionAttemptsPer15 (ESPN "SM" = submissions landed; used as rate proxy)
 * - sigStrikesAbsorbedPerMin + strikingDefense when both fighters' fight logs share a competition id
 * - Target mix averages: head/body/leg %
 * - Reversals total; ground advances total (control proxy)
 *
 * UNAVAILABLE from current ESPN payloads (left null / omitted):
 * - Official UFCStats-style control time (minutes)
 * - True submission *attempts* distinct from submissions landed
 * - Opponent-facing takedown defense as a published career % (not on ESPN fighter stats tables)
 * - Distance/clinch/ground *defense* splits
 * - Quality of opposition index (no ranking-of-opponent series in ESPN athlete stats)
 * - Explicit "UFC fight count" field (inferred from UFC-tagged events when present)
 * - Five-round experience as a first-party ESPN field (inferred from completed 5-round bouts)
 * - Inactivity days as ESPN field (derived from last fight date when known)
 *
 * NEVER invent missing rate stats. Prefer null over fabricated SLpM / defense numbers.
 */
export const DATA_AVAILABILITY = {
  source: "espn-ufc",
  availableRates: [
    "sigStrikesLandedPerMin",
    "sigStrikeAccuracy",
    "sigStrikesAbsorbedPerMin",
    "strikingDefense",
    "takedownsPer15",
    "takedownAccuracy",
    "submissionAttemptsPer15",
    "knockdownsPer15",
  ] as const,
  unavailable: [
    "controlTimeMinutes",
    "submissionAttemptsDistinctFromLanded",
    "publishedTakedownDefensePercent",
    "positionalStrikingDefenseSplits",
    "qualityOfOppositionIndex",
  ] as const,
} as const;
