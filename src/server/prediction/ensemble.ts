/**
 * Ensemble of complementary submodels + disagreement metric.
 */

function sigmoid(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

export type SubmodelOutput = {
  name: "strength" | "matchup" | "form";
  /** P(A wins) in [0,1], draw excluded / renormalized. */
  pA: number;
};

export type EnsembleResult = {
  /** Blended P(A wins) before draw allocation. */
  pA: number;
  /** Logit of blended P(A). */
  logit: number;
  /** 0–1 agreement (1 = all models agree). */
  agreement: number;
  submodels: SubmodelOutput[];
};

/**
 * Weighted blend of submodel probabilities.
 * Default weights favor matchup, then strength, then form.
 */
export function ensembleWinner(
  submodels: SubmodelOutput[],
  weights: Record<SubmodelOutput["name"], number> = {
    strength: 0.3,
    matchup: 0.45,
    form: 0.25,
  },
): EnsembleResult {
  let wSum = 0;
  let pSum = 0;
  for (const m of submodels) {
    const w = weights[m.name] ?? 0.2;
    wSum += w;
    pSum += w * m.pA;
  }
  const pA = wSum > 0 ? pSum / wSum : 0.5;
  const agreement = modelAgreement(submodels.map((m) => m.pA));
  const eps = 1e-6;
  const pp = Math.min(1 - eps, Math.max(eps, pA));
  return {
    pA,
    logit: Math.log(pp / (1 - pp)),
    agreement,
    submodels,
  };
}

/**
 * Agreement = 1 - normalized stddev of submodel P(A).
 */
export function modelAgreement(probs: number[]): number {
  if (probs.length < 2) return 1;
  const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
  const variance =
    probs.reduce((s, p) => s + (p - mean) ** 2, 0) / probs.length;
  const std = Math.sqrt(variance);
  // std of 0.25 (e.g. 0.4 vs 0.9) → agreement ~0
  return Math.max(0, Math.min(1, 1 - std / 0.25));
}

export function eloToPA(eloLogitValue: number): number {
  return sigmoid(eloLogitValue * 1.1);
}

export function formToPA(form3A: number, form3B: number): number {
  return sigmoid((form3A - form3B) * 2.2);
}
