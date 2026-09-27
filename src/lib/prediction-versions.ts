/**
 * FightScope Prediction Engine version stamps.
 * Shared by server engine + client History archives.
 * Bump when features or model math change so caches invalidate cleanly.
 */
export const PREDICTION_MODEL_VERSION = "prediction_engine_v4";
export const PREDICTION_FEATURE_VERSION = "features_v4";
export const PREDICTION_DATA_SNAPSHOT_VERSION = "catalog_asof_v1";
export const PREDICTION_CALIBRATION_VERSION = "platt_temp_v1";
export const PREDICTION_METHOD_MODEL_VERSION = "joint_softmax_v4";

/** Legacy analysis cache key bump — numerical model owns probabilities. */
export const ANALYSIS_ENGINE_VERSION_V3 = "fs-analysis-v3-structural";
/** Production cache key for v4 structural engine. */
export const ANALYSIS_ENGINE_VERSION_V4 = "fs-analysis-v4-calibrated";
