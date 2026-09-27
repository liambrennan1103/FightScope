import "server-only";

import type { Fighter, Prediction } from "@/lib/types";
import type { StarterAnalysisPayload } from "@/lib/analysis-payload";
import {
  ANALYSIS_ENGINE_VERSION,
  analysisCacheKey,
  combinedInputHash,
  fetchReadyAnalysis,
  fighterFingerprint,
  isCacheFresh,
  mirrorPredictionForRequestOrder,
  readDiskAnalysisCache,
  writeDiskAnalysisCache,
  type CachedAnalysis,
} from "@/server/analysis/cache";
import { assessDataQuality } from "@/server/analysis/data-quality";
import { explainStarter } from "@/server/analysis/explain";
import { buildStructuralPrediction } from "@/server/analysis/predict";
import type { MatchupContext } from "@/server/analysis/stat-types";
import { isSupabaseConfigured } from "@/server/supabase/client";

export type StarterAnalyzeResult = {
  analysis: StarterAnalysisPayload;
  cacheHit: boolean;
  explanationSource: "llm" | "template";
  engineVersion: string;
  dataQuality: "HIGH" | "MEDIUM" | "LOW";
};

function mirrorDiskPrediction(
  disk: CachedAnalysis,
  fighterA: Fighter,
  fighterB: Fighter,
): Prediction {
  if (disk.fighterAId === fighterA.id) return disk.prediction;
  return {
    ...disk.prediction,
    fighterAWinPct: disk.prediction.fighterBWinPct,
    fighterBWinPct: disk.prediction.fighterAWinPct,
    predictedWinnerId:
      disk.prediction.predictedWinnerId === disk.fighterAId
        ? fighterB.id
        : disk.prediction.predictedWinnerId === disk.fighterBId
          ? fighterA.id
          : disk.prediction.predictedWinnerId,
    keyAdvantages: {
      fighterA: disk.prediction.keyAdvantages.fighterB,
      fighterB: disk.prediction.keyAdvantages.fighterA,
    },
    jointOutcomes: disk.prediction.jointOutcomes
      ? {
          aKoTko: disk.prediction.jointOutcomes.bKoTko,
          aSubmission: disk.prediction.jointOutcomes.bSubmission,
          aDecision: disk.prediction.jointOutcomes.bDecision,
          bKoTko: disk.prediction.jointOutcomes.aKoTko,
          bSubmission: disk.prediction.jointOutcomes.aSubmission,
          bDecision: disk.prediction.jointOutcomes.aDecision,
          draw: disk.prediction.jointOutcomes.draw,
        }
      : undefined,
    topFactors: disk.prediction.topFactors?.map((f) => ({
      ...f,
      edge:
        f.edge === "fighterA" ? "fighterB" : f.edge === "fighterB" ? "fighterA" : f.edge,
      magnitude: -f.magnitude,
    })),
  };
}

function hitFromPrediction(
  prediction: Prediction,
  fighterA: Fighter,
  fighterB: Fighter,
  explanationSource: "llm" | "template",
  dataQuality: "HIGH" | "MEDIUM" | "LOW",
): StarterAnalyzeResult {
  return {
    analysis: predictionToStarter(
      prediction,
      fighterA,
      fighterB,
      prediction.jointOutcomes?.draw ?? 0,
    ),
    cacheHit: true,
    explanationSource,
    engineVersion: ANALYSIS_ENGINE_VERSION,
    dataQuality,
  };
}

/**
 * Starter-tier analysis.
 * Reuses the global canonical cache (disk base key + Supabase) so a second user
 * pays ZERO Anthropic cost when a valid analysis already exists.
 * Response never includes Pro narrative modules.
 */
export async function analyzeFightStarter(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContext = { rounds: 3, isTitle: false, division: null },
  options: { bypassCache?: boolean; skipLlm?: boolean } = {},
): Promise<StarterAnalyzeResult> {
  const dataQuality = assessDataQuality(fighterA, fighterB);
  const baseKey = analysisCacheKey(
    fighterA.id,
    fighterB.id,
    context.rounds,
    context.isTitle,
  );
  const starterKey = `${baseKey}:starter`;
  const inputHash = combinedInputHash(fighterA, fighterB, context.rounds, context.isTitle);

  if (!options.bypassCache) {
    // 1) Starter-specific disk (includes shortRead from prior Starter run)
    const starterDisk = readDiskAnalysisCache(starterKey);
    if (starterDisk && isCacheFresh(starterDisk, fighterA, fighterB)) {
      return hitFromPrediction(
        mirrorDiskPrediction(starterDisk, fighterA, fighterB),
        fighterA,
        fighterB,
        starterDisk.explanationSource,
        dataQuality,
      );
    }

    // 2) Canonical shared disk (Pro or prior structural write)
    const sharedDisk = readDiskAnalysisCache(baseKey);
    if (sharedDisk && isCacheFresh(sharedDisk, fighterA, fighterB)) {
      return hitFromPrediction(
        mirrorDiskPrediction(sharedDisk, fighterA, fighterB),
        fighterA,
        fighterB,
        sharedDisk.explanationSource,
        dataQuality,
      );
    }

    // 3) Global Supabase canonical row (multi-user)
    if (isSupabaseConfigured()) {
      const ready = await fetchReadyAnalysis(baseKey, inputHash);
      if (ready) {
        const mirrored = mirrorPredictionForRequestOrder(ready, fighterA.id);
        return hitFromPrediction(
          mirrored,
          fighterA,
          fighterB,
          ready.explanation_source === "llm" ? "llm" : "template",
          ready.data_quality,
        );
      }
    }
  }

  let prediction = buildStructuralPrediction(fighterA, fighterB, context);
  let explanationSource: "llm" | "template" = "template";
  let drawPct = prediction.jointOutcomes?.draw ?? 0;
  let keyMatchupFactors: string[] = [
    ...prediction.keyAdvantages.fighterA.slice(0, 2),
    ...prediction.keyAdvantages.fighterB.slice(0, 2),
  ].slice(0, 5);
  let shortRead = prediction.analysis.fightscopeRead;

  if (!options.skipLlm) {
    const starter = await explainStarter(fighterA, fighterB, prediction);
    explanationSource = starter.source;
    prediction = {
      ...prediction,
      analysis: {
        fightscopeRead: starter.shortRead || prediction.analysis.fightscopeRead,
        howAWins: "",
        howBWins: "",
      },
      keyAdvantages: {
        fighterA:
          starter.keyMatchupFactors.slice(0, 3).length > 0
            ? starter.keyMatchupFactors.slice(0, 3)
            : prediction.keyAdvantages.fighterA,
        fighterB: prediction.keyAdvantages.fighterB,
      },
    };
    keyMatchupFactors =
      starter.keyMatchupFactors.length >= 3
        ? starter.keyMatchupFactors
        : keyMatchupFactors;
    shortRead = starter.shortRead || shortRead;
  }

  const cachePayload = {
    version: ANALYSIS_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    fighterAId: fighterA.id,
    fighterBId: fighterB.id,
    fighterAFingerprint: fighterFingerprint(fighterA),
    fighterBFingerprint: fighterFingerprint(fighterB),
    prediction,
    explanationSource,
    dataQuality,
    status: "ready" as const,
  };

  // Canonical shared key + starter key (second user / Pro can reuse)
  writeDiskAnalysisCache({ ...cachePayload, key: baseKey });
  writeDiskAnalysisCache({ ...cachePayload, key: starterKey });

  return {
    analysis: {
      tier: "starter",
      fighterAWinPct: prediction.fighterAWinPct,
      fighterBWinPct: prediction.fighterBWinPct,
      drawPct,
      predictedWinnerId: prediction.predictedWinnerId,
      predictedWinnerName:
        prediction.predictedWinnerId === fighterA.id ? fighterA.name : fighterB.name,
      confidence: prediction.confidence,
      keyMatchupFactors:
        keyMatchupFactors.length >= 3
          ? keyMatchupFactors.slice(0, 5)
          : [
              "Striking efficiency",
              "Grappling threat",
              "Defensive reliability",
              "Recent form",
            ].slice(0, 4),
      shortRead: shortRead || null,
      engine: {
        methods: prediction.methods,
        jointOutcomes: prediction.jointOutcomes,
        topFactors: prediction.topFactors,
        mostLikelyPath: prediction.mostLikelyPath,
        coverageLevel: prediction.coverageLevel,
        coverageReasons: prediction.coverageReasons,
        coverageScore: prediction.coverageScore,
        modelVersion: prediction.modelVersion,
        featureVersion: prediction.featureVersion,
      },
    },
    cacheHit: false,
    explanationSource,
    engineVersion: ANALYSIS_ENGINE_VERSION,
    dataQuality,
  };
}

function predictionToStarter(
  prediction: Prediction,
  fighterA: Fighter,
  fighterB: Fighter,
  drawPct: number,
): StarterAnalysisPayload {
  const factors = [
    ...prediction.keyAdvantages.fighterA,
    ...prediction.keyAdvantages.fighterB,
  ]
    .filter(Boolean)
    .slice(0, 5);
  return {
    tier: "starter",
    fighterAWinPct: prediction.fighterAWinPct,
    fighterBWinPct: prediction.fighterBWinPct,
    drawPct,
    predictedWinnerId: prediction.predictedWinnerId,
    predictedWinnerName:
      prediction.predictedWinnerId === fighterA.id ? fighterA.name : fighterB.name,
    confidence: prediction.confidence,
    keyMatchupFactors:
      factors.length >= 3
        ? factors
        : ["Striking efficiency", "Grappling threat", "Defensive reliability"],
    shortRead: prediction.analysis.fightscopeRead || null,
    engine: {
      methods: prediction.methods,
      jointOutcomes: prediction.jointOutcomes,
      topFactors: prediction.topFactors,
      mostLikelyPath: prediction.mostLikelyPath,
      coverageLevel: prediction.coverageLevel,
      coverageReasons: prediction.coverageReasons,
      coverageScore: prediction.coverageScore,
      modelVersion: prediction.modelVersion,
      featureVersion: prediction.featureVersion,
    },
  };
}
