export {
  predictFightStructural,
  toLegacyPrediction,
  buildPredictionV3,
  buildPredictionV4,
  ensurePredictionArtifactsLoaded,
} from "@/server/prediction/engine";
export type {
  EnginePrediction,
  JointOutcomes,
  StructuredFactor,
  MatchupContextV3,
} from "@/server/prediction/types";
export {
  PREDICTION_MODEL_VERSION,
  PREDICTION_FEATURE_VERSION,
  PREDICTION_CALIBRATION_VERSION,
  ANALYSIS_ENGINE_VERSION_V3,
  ANALYSIS_ENGINE_VERSION_V4,
} from "@/server/prediction/versions";
export { SOURCE_REGISTRY, activeSources } from "@/server/prediction/sources/registry";
export { fighterAsOf, classifyMethod } from "@/server/prediction/as-of";
export { buildEloHistory, eloLogit } from "@/server/prediction/elo";
export { modelAgreement, ensembleWinner } from "@/server/prediction/ensemble";
export { fitPlatt, applyPlatt } from "@/server/prediction/platt";
export { combineReliability, shrinkByReliability } from "@/server/prediction/reliability";
