/**
 * Coverage score + probability shrinkage toward base rates / 50-50.
 */

import type { MatchupFeatures } from "@/server/prediction/features";
import type { DataCoverageLevel } from "@/server/prediction/types";

export function coverageFromFeatures(features: MatchupFeatures): {
  score: number;
  level: DataCoverageLevel;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = features.coverageScore;

  if (features.a.experienceBouts < 5 || features.b.experienceBouts < 5) {
    score -= 0.12;
    reasons.push("Limited pro fight sample");
  }
  if (features.a.form3 === 0.5 && features.a.experienceBouts < 3) {
    reasons.push("Sparse recent form for fighter A");
  }
  if (features.asOf) {
    score -= 0.08;
    reasons.push("As-of snapshot: career rates down-weighted");
  }
  if (features.a.slpm == null || features.b.slpm == null) {
    score -= 0.1;
    reasons.push("Missing striking rate stats");
  }
  if (features.a.tdDef == null && features.b.tdDef == null) {
    score -= 0.05;
    reasons.push("Missing takedown defense");
  }

  score = Math.min(1, Math.max(0, score));
  const level: DataCoverageLevel = score >= 0.72 ? "HIGH" : score >= 0.4 ? "MEDIUM" : "LOW";
  if (reasons.length === 0) {
    reasons.push(
      level === "HIGH"
        ? "Multiple reliable fields + sufficient recent fights"
        : level === "MEDIUM"
          ? "Partial statistical coverage"
          : "Limited comparable fight data",
    );
  }
  return { score, level, reasons };
}

/**
 * Shrink a probability of A toward 0.5 based on coverage.
 * strength: how aggressively to shrink (fit on validation).
 */
export function shrinkProbability(
  pA: number,
  coverageScore: number,
  strength = 0.55,
): number {
  const shrink = strength * (1 - coverageScore);
  return pA * (1 - shrink) + 0.5 * shrink;
}

/**
 * Blend joint probs toward stratified method base × winner 50/50 when coverage low.
 */
export function shrinkJointProbs(
  probs: number[],
  coverageScore: number,
  base: { koTko: number; submission: number; decision: number },
  strength = 0.5,
): number[] {
  const shrink = strength * (1 - coverageScore);
  if (shrink <= 0.01) return probs;

  // Prior: equal fighters × base methods, tiny draw
  const prior = [
    0.5 * base.koTko * 0.985,
    0.5 * base.submission * 0.985,
    0.5 * base.decision * 0.985,
    0.5 * base.koTko * 0.985,
    0.5 * base.submission * 0.985,
    0.5 * base.decision * 0.985,
    0.015,
  ];
  const sumPrior = prior.reduce((a, b) => a + b, 0) || 1;
  const normPrior = prior.map((p) => p / sumPrior);
  return probs.map((p, i) => p * (1 - shrink) + normPrior[i]! * shrink);
}
