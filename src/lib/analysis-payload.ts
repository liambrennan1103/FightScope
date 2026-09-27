import type {
  Confidence,
  Fighter,
  JointOutcomeDistribution,
  MethodDistribution,
  Prediction,
  PredictionFactor,
} from "@/lib/types";

/** Structural engine fields safe for Starter (no Pro narrative modules). */
export type EngineSnapshot = {
  methods: MethodDistribution;
  jointOutcomes?: JointOutcomeDistribution;
  topFactors?: PredictionFactor[];
  mostLikelyPath?: Prediction["mostLikelyPath"];
  coverageLevel?: Prediction["coverageLevel"];
  coverageReasons?: string[];
  coverageScore?: number;
  modelVersion?: string;
  featureVersion?: string;
};

/** Strict Starter API shape — never includes Pro narrative modules. */
export type StarterAnalysisPayload = {
  tier: "starter";
  fighterAWinPct: number;
  fighterBWinPct: number;
  drawPct: number;
  predictedWinnerId: string;
  predictedWinnerName: string;
  confidence: Confidence;
  keyMatchupFactors: string[];
  shortRead: string | null;
  engine?: EngineSnapshot;
};

/** Full Pro API shape. */
export type ProAnalysisPayload = {
  tier: "pro";
  prediction: Prediction;
  drawPct: number;
  keyMatchupFactors: string[];
  fightscopeRating: number;
};

export type AnalysisApiPayload = StarterAnalysisPayload | ProAnalysisPayload;

/** Client-normalized prediction used by fight/compare UI. */
export type ClientAnalysis = {
  tier: "starter" | "pro";
  fighterAWinPct: number;
  fighterBWinPct: number;
  drawPct: number;
  predictedWinnerId: string;
  confidence: Confidence;
  keyMatchupFactors: string[];
  shortRead: string | null;
  /** Present only for Pro — never hydrated from Starter responses. */
  prediction: Prediction | null;
  fightscopeRating: number | null;
  /** Structural engine snapshot available to Starter + Pro. */
  engine: EngineSnapshot;
};

export function engineSnapshotFromPrediction(prediction: Prediction): EngineSnapshot {
  return {
    methods: prediction.methods,
    jointOutcomes: prediction.jointOutcomes,
    topFactors: prediction.topFactors,
    mostLikelyPath: prediction.mostLikelyPath,
    coverageLevel: prediction.coverageLevel,
    coverageReasons: prediction.coverageReasons,
    coverageScore: prediction.coverageScore,
    modelVersion: prediction.modelVersion,
    featureVersion: prediction.featureVersion,
  };
}

export function normalizeAnalysisPayload(
  payload: AnalysisApiPayload,
  fighterA: Fighter,
  fighterB: Fighter,
): ClientAnalysis {
  void fighterA;
  void fighterB;
  if (payload.tier === "starter") {
    const engine =
      payload.engine ??
      ({
        methods: { koTko: 0, decision: 0, submission: 0 },
      } satisfies EngineSnapshot);
    return {
      tier: "starter",
      fighterAWinPct: payload.fighterAWinPct,
      fighterBWinPct: payload.fighterBWinPct,
      drawPct: payload.drawPct,
      predictedWinnerId: payload.predictedWinnerId,
      confidence: payload.confidence,
      keyMatchupFactors: payload.keyMatchupFactors,
      shortRead: payload.shortRead,
      prediction: null,
      fightscopeRating: null,
      engine,
    };
  }

  const prediction = payload.prediction;
  return {
    tier: "pro",
    fighterAWinPct: prediction.fighterAWinPct,
    fighterBWinPct: prediction.fighterBWinPct,
    drawPct: payload.drawPct,
    predictedWinnerId: prediction.predictedWinnerId,
    confidence: prediction.confidence,
    keyMatchupFactors: payload.keyMatchupFactors,
    shortRead: prediction.analysis.fightscopeRead,
    prediction,
    fightscopeRating: payload.fightscopeRating,
    engine: engineSnapshotFromPrediction(prediction),
  };
}

/** Build a Prediction-shaped object for History when only Starter fields exist. */
export function starterToHistoryPrediction(
  analysis: ClientAnalysis,
  fighterA: Fighter,
  fighterB: Fighter,
): Prediction {
  if (analysis.prediction) return analysis.prediction;
  void fighterA;
  void fighterB;
  return {
    fighterAWinPct: analysis.fighterAWinPct,
    fighterBWinPct: analysis.fighterBWinPct,
    predictedWinnerId: analysis.predictedWinnerId,
    confidence: analysis.confidence,
    methods: analysis.engine.methods,
    jointOutcomes: analysis.engine.jointOutcomes,
    topFactors: analysis.engine.topFactors,
    mostLikelyPath: analysis.engine.mostLikelyPath,
    coverageLevel: analysis.engine.coverageLevel,
    coverageReasons: analysis.engine.coverageReasons,
    coverageScore: analysis.engine.coverageScore,
    modelVersion: analysis.engine.modelVersion,
    featureVersion: analysis.engine.featureVersion,
    analysis: {
      fightscopeRead: analysis.shortRead ?? "",
      howAWins: "",
      howBWins: "",
    },
    keyAdvantages: {
      fighterA: analysis.keyMatchupFactors.slice(0, 3),
      fighterB: [],
    },
  };
}

export function clientAnalysisFromPrediction(
  prediction: Prediction,
  tier: "starter" | "pro",
  fighterA: Fighter,
  fighterB: Fighter,
): ClientAnalysis {
  const factors = [
    ...prediction.keyAdvantages.fighterA.slice(0, 2),
    ...prediction.keyAdvantages.fighterB.slice(0, 2),
  ].slice(0, 5);

  const engine = engineSnapshotFromPrediction(prediction);
  const drawPct = prediction.jointOutcomes?.draw ?? 0;

  if (tier === "starter") {
    return {
      tier: "starter",
      fighterAWinPct: prediction.fighterAWinPct,
      fighterBWinPct: prediction.fighterBWinPct,
      drawPct,
      predictedWinnerId: prediction.predictedWinnerId,
      confidence: prediction.confidence,
      keyMatchupFactors: factors.length
        ? factors
        : ["Striking efficiency", "Grappling threat", "Recent form"],
      shortRead: prediction.analysis.fightscopeRead || null,
      prediction: null,
      fightscopeRating: null,
      engine,
    };
  }

  return {
    tier: "pro",
    fighterAWinPct: prediction.fighterAWinPct,
    fighterBWinPct: prediction.fighterBWinPct,
    drawPct,
    predictedWinnerId: prediction.predictedWinnerId,
    confidence: prediction.confidence,
    keyMatchupFactors: factors,
    shortRead: prediction.analysis.fightscopeRead,
    prediction,
    fightscopeRating: Math.round(
      (fighterA.fightscopeScore + fighterB.fightscopeScore) / 2,
    ),
    engine,
  };
}
