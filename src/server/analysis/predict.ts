import type {
  Confidence,
  Fighter,
  MethodDistribution,
  Prediction,
} from "@/lib/types";
import type { MatchupContext } from "@/server/analysis/stat-types";
import {
  buildPredictionV3,
  predictFightStructural,
  toLegacyPrediction,
} from "@/server/prediction/engine";
import type { MatchupContextV3 } from "@/server/prediction/types";

/**
 * @deprecated Legacy helpers kept for self-tests that import scoreMatchup.
 * Live analysis uses prediction_engine_v3 via buildPrediction().
 */
export { scoreMatchup, stableNoise } from "@/server/analysis/predict-legacy";

function toV3Context(context: MatchupContext): MatchupContextV3 {
  return {
    rounds: context.rounds,
    isTitle: context.isTitle,
    division: context.division,
  };
}

/**
 * Deterministic structural prediction (prediction_engine_v3).
 * Claude must not replace these numbers.
 */
export function buildPrediction(
  fighterA: Fighter,
  fighterB: Fighter,
  _fighterAWinPct: number,
  context: MatchupContext,
): Prediction {
  const { prediction, engine } = buildPredictionV3(fighterA, fighterB, toV3Context(context));
  return {
    ...prediction,
    jointOutcomes: engine.joint,
    topFactors: engine.topFactors,
    mostLikelyPath: {
      label: engine.mostLikelyPath.label,
      pct: engine.mostLikelyPath.pct,
      method: engine.mostLikelyPath.method,
    },
    modelVersion: engine.modelVersion,
    featureVersion: engine.featureVersion,
    coverageScore: engine.coverage.score,
    coverageLevel: engine.coverage.level,
    coverageReasons: engine.coverage.reasons,
  };
}

export function buildStructuralPrediction(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContext,
): Prediction {
  return buildPrediction(fighterA, fighterB, 50, context);
}

export type { MethodDistribution, Confidence };
