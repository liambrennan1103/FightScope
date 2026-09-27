/**
 * Model artifact registry — calibration, base rates, Platt, metadata.
 * Loaded at boot for production; written by backtest.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { StratifiedBaseRates } from "@/server/prediction/base-rates";
import type { CalibrationParams } from "@/server/prediction/calibrate";
import type { PlattParams } from "@/server/prediction/platt";
import {
  PREDICTION_CALIBRATION_VERSION,
  PREDICTION_DATA_SNAPSHOT_VERSION,
  PREDICTION_FEATURE_VERSION,
  PREDICTION_MODEL_VERSION,
} from "@/lib/prediction-versions";

export type ModelArtifact = {
  modelVersion: string;
  featureSchemaVersion: string;
  calibrationVersion: string;
  dataSnapshotVersion: string;
  trainedAt: string;
  calibration: CalibrationParams;
  platt: PlattParams;
  baseRates: StratifiedBaseRates;
  metrics?: Record<string, unknown>;
  notes?: string[];
};

const ARTIFACT_DIR = path.join(process.cwd(), "src/server/prediction/artifacts");
const ARTIFACT_FILE = path.join(ARTIFACT_DIR, "production.json");

export function artifactPath(): string {
  return ARTIFACT_FILE;
}

export function saveModelArtifact(artifact: ModelArtifact): string {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(ARTIFACT_FILE, JSON.stringify(artifact, null, 2));
  // Also versioned copy
  const versioned = path.join(
    ARTIFACT_DIR,
    `${artifact.modelVersion}-${artifact.calibrationVersion}.json`,
  );
  writeFileSync(versioned, JSON.stringify(artifact, null, 2));
  return ARTIFACT_FILE;
}

export function loadModelArtifact(): ModelArtifact | null {
  if (!existsSync(ARTIFACT_FILE)) return null;
  try {
    return JSON.parse(readFileSync(ARTIFACT_FILE, "utf8")) as ModelArtifact;
  } catch {
    return null;
  }
}

export function defaultArtifactMeta() {
  return {
    modelVersion: PREDICTION_MODEL_VERSION,
    featureSchemaVersion: PREDICTION_FEATURE_VERSION,
    calibrationVersion: PREDICTION_CALIBRATION_VERSION,
    dataSnapshotVersion: PREDICTION_DATA_SNAPSHOT_VERSION,
  };
}
