/**
 * Empirical MMA base rates from FightScope historical corpus.
 * Learned at backtest/runtime from labeled fights — not hard-coded 33/33/33.
 */

export type MethodBaseRates = {
  koTko: number;
  submission: number;
  decision: number;
  n: number;
};

export type StratifiedBaseRates = {
  overall: MethodBaseRates;
  rounds3: MethodBaseRates;
  rounds5: MethodBaseRates;
  mens: MethodBaseRates;
  womens: MethodBaseRates;
};

const DEFAULT: MethodBaseRates = {
  // Matched to FightScope catalog completed methods (~50% KO / 29% SUB / 21% DEC).
  // Decision-heavy defaults (0.46) caused systematic Decision bias.
  koTko: 0.5,
  submission: 0.29,
  decision: 0.21,
  n: 0,
};

function normalize(ko: number, sub: number, dec: number, n: number): MethodBaseRates {
  const t = ko + sub + dec || 1;
  return { koTko: ko / t, submission: sub / t, decision: dec / t, n };
}

export function fitBaseRates(
  rows: Array<{ method: "ko" | "sub" | "dec"; rounds: 3 | 5; isWomens: boolean }>,
): StratifiedBaseRates {
  const buckets = {
    overall: { ko: 0, sub: 0, dec: 0, n: 0 },
    rounds3: { ko: 0, sub: 0, dec: 0, n: 0 },
    rounds5: { ko: 0, sub: 0, dec: 0, n: 0 },
    mens: { ko: 0, sub: 0, dec: 0, n: 0 },
    womens: { ko: 0, sub: 0, dec: 0, n: 0 },
  };

  for (const row of rows) {
    const key = row.method === "ko" ? "ko" : row.method === "sub" ? "sub" : "dec";
    buckets.overall[key] += 1;
    buckets.overall.n += 1;
    if (row.rounds === 5) {
      buckets.rounds5[key] += 1;
      buckets.rounds5.n += 1;
    } else {
      buckets.rounds3[key] += 1;
      buckets.rounds3.n += 1;
    }
    if (row.isWomens) {
      buckets.womens[key] += 1;
      buckets.womens.n += 1;
    } else {
      buckets.mens[key] += 1;
      buckets.mens.n += 1;
    }
  }

  const toRates = (b: { ko: number; sub: number; dec: number; n: number }) =>
    b.n >= 20 ? normalize(b.ko, b.sub, b.dec, b.n) : { ...DEFAULT, n: b.n };

  return {
    overall: toRates(buckets.overall),
    rounds3: toRates(buckets.rounds3),
    rounds5: toRates(buckets.rounds5),
    mens: toRates(buckets.mens),
    womens: toRates(buckets.womens),
  };
}

export function selectBaseRate(
  rates: StratifiedBaseRates,
  rounds: 3 | 5,
  isWomens: boolean,
): MethodBaseRates {
  // Prefer stratified when enough mass, else overall, else default.
  const byRounds = rounds === 5 ? rates.rounds5 : rates.rounds3;
  const byGender = isWomens ? rates.womens : rates.mens;
  if (byRounds.n >= 30 && byGender.n >= 30) {
    // Blend rounds + gender strata.
    return normalize(
      (byRounds.koTko + byGender.koTko) / 2,
      (byRounds.submission + byGender.submission) / 2,
      (byRounds.decision + byGender.decision) / 2,
      Math.min(byRounds.n, byGender.n),
    );
  }
  if (byRounds.n >= 25) return byRounds;
  if (rates.overall.n >= 25) return rates.overall;
  return { ...DEFAULT };
}

/** Module-level defaults updated by backtest fit; live inference uses these. */
let LIVE_RATES: StratifiedBaseRates = {
  overall: { ...DEFAULT },
  rounds3: { ...DEFAULT },
  rounds5: { koTko: 0.42, submission: 0.22, decision: 0.36, n: 0 },
  mens: { ...DEFAULT },
  womens: { koTko: 0.32, submission: 0.22, decision: 0.46, n: 0 },
};

export function getLiveBaseRates(): StratifiedBaseRates {
  return LIVE_RATES;
}

export function setLiveBaseRates(rates: StratifiedBaseRates): void {
  LIVE_RATES = rates;
}
