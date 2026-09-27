import type { Confidence } from "@/lib/types";

/** Six-way (+ draw) joint outcome distribution — integers summing to 100. */
export type JointOutcomes = {
  aKoTko: number;
  aSubmission: number;
  aDecision: number;
  bKoTko: number;
  bSubmission: number;
  bDecision: number;
  draw: number;
};

export type MethodShares = {
  koTko: number;
  submission: number;
  decision: number;
};

export type WinnerShares = {
  fighterAWinPct: number;
  fighterBWinPct: number;
  drawPct: number;
};

export type FactorEdge = "fighterA" | "fighterB" | "neutral";

export type StructuredFactor = {
  factor: string;
  label: string;
  edge: FactorEdge;
  /** Signed contribution toward fighter A (positive = A edge). */
  magnitude: number;
};

export type DataCoverageLevel = "HIGH" | "MEDIUM" | "LOW";

export type ProvenanceRecord = {
  field: string;
  value: string | number | null;
  source: string;
  sourceType: "official" | "specialist" | "editorial" | "derived" | "catalog";
  sourceWeight: number;
  retrievedAt: string;
  effectiveAt?: string;
};

export type SourceConflict = {
  field: string;
  values: Array<{ source: string; value: string | number | null; weight: number }>;
  resolvedSource: string;
  resolvedValue: string | number | null;
};

export type EnginePrediction = {
  modelVersion: string;
  featureVersion: string;
  dataSnapshotVersion: string;
  calibrationVersion?: string;
  methodModelVersion?: string;
  generatedAt: string;
  winner: WinnerShares;
  methods: MethodShares;
  joint: JointOutcomes;
  predictedWinnerSide: "A" | "B" | "draw";
  mostLikelyPath: {
    side: "A" | "B" | "draw";
    method: "koTko" | "submission" | "decision" | "draw";
    label: string;
    pct: number;
  };
  confidence: Confidence;
  coverage: {
    level: DataCoverageLevel;
    score: number;
    reasons: string[];
  };
  /** Numerical reliability 0–1 (drives uncertainty shrinkage). */
  reliability?: {
    overall: number;
    sampleSize: number;
    modelAgreement: number;
    dataCompleteness: number;
  };
  modelAgreement?: number;
  diagnostics?: {
    rawPA: number;
    calibratedPA: number;
    reliabilityAdjustedPA: number;
    strengthPA: number;
    matchupPA: number;
    formPA: number;
  };
  topFactors: StructuredFactor[];
  provenance?: ProvenanceRecord[];
  conflicts?: SourceConflict[];
};

export type MatchupContextV3 = {
  rounds: 3 | 5;
  isTitle: boolean;
  division: string | null;
  /** ISO date — features must only use info strictly before this. */
  asOf?: string;
  /** Exclude this fight id / key from history when present. */
  excludeFightKey?: string;
};
