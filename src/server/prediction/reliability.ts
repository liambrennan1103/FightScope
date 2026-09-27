/**
 * Reliability / uncertainty scoring + logit shrinkage toward 50/50.
 * Purely numerical — Claude never assigns these values.
 */

export type ReliabilityComponents = {
  dataCompleteness: number;
  sampleSize: number;
  opponentQuality: number;
  modelAgreement: number;
  dataFreshness: number;
};

export type ReliabilityScore = ReliabilityComponents & {
  overall: number;
};

/**
 * Combine reliability components into [0,1].
 * Low sample / completeness dominate the floor.
 */
export function combineReliability(c: ReliabilityComponents): ReliabilityScore {
  const overall = clamp01(
    0.28 * c.dataCompleteness +
      0.28 * c.sampleSize +
      0.16 * c.opponentQuality +
      0.18 * c.modelAgreement +
      0.1 * c.dataFreshness,
  );
  return { ...c, overall };
}

/**
 * Shrink a probability of A toward 0.5 using reliability r ∈ [0,1].
 * logit(P_final) = r × logit(P_raw)  (with floor so r never fully zeros evidence)
 */
export function shrinkByReliability(pA: number, reliability: number, floor = 0.35): number {
  const r = Math.max(floor, Math.min(1, reliability));
  const eps = 1e-6;
  const p = Math.min(1 - eps, Math.max(eps, pA));
  const logit = Math.log(p / (1 - p));
  const shrunk = 1 / (1 + Math.exp(-(r * logit)));
  return shrunk;
}

/**
 * Shrink a 7-way joint distribution by blending toward a neutral prior,
 * scaled by (1 - reliability).
 */
export function shrinkJointByReliability(
  probs: number[],
  reliability: number,
  prior: number[],
  floor = 0.35,
): number[] {
  const r = Math.max(floor, Math.min(1, reliability));
  const shrink = 1 - r;
  if (shrink <= 0.02) return probs;
  const sumP = prior.reduce((a, b) => a + b, 0) || 1;
  const normPrior = prior.map((p) => p / sumP);
  return probs.map((p, i) => p * (1 - shrink) + normPrior[i]! * shrink);
}

export function sampleSizeReliability(experienceBoutsA: number, experienceBoutsB: number): number {
  const minBouts = Math.min(experienceBoutsA, experienceBoutsB);
  // 0 fights → ~0.2, 3 → ~0.45, 8 → ~0.75, 15+ → ~0.95
  return clamp01(1 - Math.exp(-minBouts / 6));
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
