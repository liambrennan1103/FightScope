import "server-only";

import type { Fighter, Prediction } from "@/lib/types";
import {
  ANALYSIS_ENGINE_VERSION,
  analysisCacheKey,
  claimAnalysisGeneration,
  combinedInputHash,
  completeAnalysisGeneration,
  failAnalysisGeneration,
  fetchReadyAnalysis,
  fighterFingerprint,
  isCacheFresh,
  mirrorPredictionForRequestOrder,
  readDiskAnalysisCache,
  recordAnalysisRun,
  waitForReadyAnalysis,
  writeDiskAnalysisCache,
} from "@/server/analysis/cache";
import { AI_VERSION, PROMPT_VERSION, assessDataQuality, qualityNote } from "@/server/analysis/data-quality";
import { applyLlmEnrichment, explainPrediction } from "@/server/analysis/explain";
import { buildStructuralPrediction } from "@/server/analysis/predict";
import type { MatchupContext } from "@/server/analysis/stat-types";
import { isSupabaseConfigured } from "@/server/supabase/client";

export interface AnalyzeFightResult {
  prediction: Prediction;
  cacheHit: boolean;
  explanationSource: "llm" | "template";
  engineVersion: string;
  dataQuality: "HIGH" | "MEDIUM" | "LOW";
  persistence: "supabase" | "disk" | "memory";
}

function withQualityNote(prediction: Prediction, _note: string): Prediction {
  // Never append internal data-quality sentences into user-facing analysis copy.
  const cleaned = prediction.analysis.fightscopeRead
    .replace(/\s*Data quality:\s*[^.]*\.?/gi, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (cleaned === prediction.analysis.fightscopeRead) return prediction;
  return {
    ...prediction,
    analysis: { ...prediction.analysis, fightscopeRead: cleaned },
  };
}

function generateStructured(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContext,
): Prediction {
  return buildStructuralPrediction(fighterA, fighterB, context);
}

async function persistDisk(
  key: string,
  fighterA: Fighter,
  fighterB: Fighter,
  prediction: Prediction,
  explanationSource: "llm" | "template",
  dataQuality: "HIGH" | "MEDIUM" | "LOW",
) {
  writeDiskAnalysisCache({
    key,
    version: ANALYSIS_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    fighterAId: fighterA.id,
    fighterBId: fighterB.id,
    fighterAFingerprint: fighterFingerprint(fighterA),
    fighterBFingerprint: fighterFingerprint(fighterB),
    prediction,
    explanationSource,
    dataQuality,
    status: "ready",
  });
}

export async function analyzeFight(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContext = { rounds: 3, isTitle: false, division: null },
  options: {
    bypassCache?: boolean;
    skipLlm?: boolean;
    triggerSource?: string;
  } = {},
): Promise<AnalyzeFightResult> {
  const dataQuality = assessDataQuality(fighterA, fighterB);
  const quality = qualityNote(dataQuality);
  const matchupKey = analysisCacheKey(
    fighterA.id,
    fighterB.id,
    context.rounds,
    context.isTitle,
  );
  const inputHash = combinedInputHash(fighterA, fighterB, context.rounds, context.isTitle);
  const triggerSource = options.triggerSource ?? "api";

  // --- Supabase production path ---
  if (isSupabaseConfigured() && !options.bypassCache) {
    const ready = await fetchReadyAnalysis(matchupKey, inputHash);
    if (ready) {
      await recordAnalysisRun({
        matchupKey,
        fightAnalysisId: ready.id,
        runType: "cache_hit",
        triggerSource,
        status: "succeeded",
      });
      return {
        prediction: withQualityNote(mirrorPredictionForRequestOrder(ready, fighterA.id), quality),
        cacheHit: true,
        explanationSource: ready.explanation_source === "llm" ? "llm" : "template",
        engineVersion: ANALYSIS_ENGINE_VERSION,
        dataQuality: ready.data_quality,
        persistence: "supabase",
      };
    }

    const claim = await claimAnalysisGeneration({
      matchupKey,
      fighterA,
      fighterB,
      rounds: context.rounds,
      isTitle: context.isTitle,
      division: context.division,
      inputHash,
      promptVersion: PROMPT_VERSION,
      aiVersion: AI_VERSION,
      dataQuality,
    });

    if (!claim.claimed) {
      const waited = await waitForReadyAnalysis(matchupKey, inputHash);
      if (waited) {
        await recordAnalysisRun({
          matchupKey,
          fightAnalysisId: waited.id,
          runType: "cache_hit",
          triggerSource,
          status: "succeeded",
          details: { waited: true },
        });
        return {
          prediction: withQualityNote(mirrorPredictionForRequestOrder(waited, fighterA.id), quality),
          cacheHit: true,
          explanationSource: waited.explanation_source === "llm" ? "llm" : "template",
          engineVersion: ANALYSIS_ENGINE_VERSION,
          dataQuality: waited.data_quality,
          persistence: "supabase",
        };
      }

      // Last attempt: reclaim/generate once more; never fall back to uncoordinated local write in prod.
      const retry = await claimAnalysisGeneration({
        matchupKey,
        fighterA,
        fighterB,
        rounds: context.rounds,
        isTitle: context.isTitle,
        division: context.division,
        inputHash,
        promptVersion: PROMPT_VERSION,
        aiVersion: AI_VERSION,
        dataQuality,
      });
      if (!retry.claimed || !retry.token) {
        const structured = withQualityNote(generateStructured(fighterA, fighterB, context), quality);
        return {
          prediction: structured,
          cacheHit: false,
          explanationSource: "template",
          engineVersion: ANALYSIS_ENGINE_VERSION,
          dataQuality,
          persistence: "supabase",
        };
      }
      claim.claimed = true;
      claim.token = retry.token;
      claim.row = retry.row;
    }

    if (claim.claimed && claim.token) {
      await recordAnalysisRun({
        matchupKey,
        fightAnalysisId: claim.row?.id,
        runType: "generate",
        triggerSource,
        status: "started",
      });

      let prediction = generateStructured(fighterA, fighterB, context);
      const structuralQuality =
        prediction.coverageLevel ?? assessDataQuality(fighterA, fighterB);
      prediction = withQualityNote(prediction, qualityNote(structuralQuality));
      let explanationSource: "llm" | "template" = "template";

      try {
        if (!options.skipLlm) {
          const explained = await explainPrediction(fighterA, fighterB, prediction);
          prediction = withQualityNote(
            applyLlmEnrichment(fighterA, fighterB, prediction, explained),
            qualityNote(structuralQuality),
          );
          explanationSource = explained.source;
        }
        const saved = await completeAnalysisGeneration({
          matchupKey,
          claimToken: claim.token,
          prediction,
          explanationSource,
          dataQuality: structuralQuality,
          promptVersion: PROMPT_VERSION,
          aiVersion: AI_VERSION,
        });
        await recordAnalysisRun({
          matchupKey,
          fightAnalysisId: saved?.id,
          runType: "generate",
          triggerSource,
          status: "succeeded",
          details: { explanationSource },
        });
        await persistDisk(
          matchupKey,
          fighterA,
          fighterB,
          prediction,
          explanationSource,
          structuralQuality,
        );
        return {
          prediction,
          cacheHit: false,
          explanationSource,
          engineVersion: ANALYSIS_ENGINE_VERSION,
          dataQuality: structuralQuality,
          persistence: "supabase",
        };
      } catch (error) {
        // LLM / unexpected failure: still persist numerical prediction when possible.
        const message = error instanceof Error ? error.message : "generation failed";
        await failAnalysisGeneration(matchupKey, claim.token, message, prediction);
        await recordAnalysisRun({
          matchupKey,
          fightAnalysisId: claim.row?.id,
          runType: "generate",
          triggerSource,
          status: "failed",
          details: { message },
        });
        await persistDisk(matchupKey, fighterA, fighterB, prediction, "template", structuralQuality);
        return {
          prediction,
          cacheHit: false,
          explanationSource: "template",
          engineVersion: ANALYSIS_ENGINE_VERSION,
          dataQuality: structuralQuality,
          persistence: "supabase",
        };
      }
    }
  }

  // --- Local disk / memory fallback (dev) ---
  if (!options.bypassCache) {
    const disk = readDiskAnalysisCache(matchupKey);
    if (disk && isCacheFresh(disk, fighterA, fighterB)) {
      const prediction =
        disk.fighterAId === fighterA.id
          ? disk.prediction
          : {
              ...disk.prediction,
              fighterAWinPct: disk.prediction.fighterBWinPct,
              fighterBWinPct: disk.prediction.fighterAWinPct,
              keyAdvantages: {
                fighterA: disk.prediction.keyAdvantages.fighterB,
                fighterB: disk.prediction.keyAdvantages.fighterA,
              },
              analysis: {
                howAWins: disk.prediction.analysis.howBWins,
                howBWins: disk.prediction.analysis.howAWins,
                fightscopeRead: disk.prediction.analysis.fightscopeRead,
              },
            };
      return {
        prediction: withQualityNote(prediction, quality),
        cacheHit: true,
        explanationSource: disk.explanationSource,
        engineVersion: ANALYSIS_ENGINE_VERSION,
        dataQuality: disk.dataQuality ?? dataQuality,
        persistence: "disk",
      };
    }
  }

  let prediction = withQualityNote(generateStructured(fighterA, fighterB, context), quality);
  let explanationSource: "llm" | "template" = "template";
  if (!options.skipLlm) {
    try {
      const explained = await explainPrediction(fighterA, fighterB, prediction);
      prediction = withQualityNote(
        applyLlmEnrichment(fighterA, fighterB, prediction, explained),
        quality,
      );
      explanationSource = explained.source;
    } catch {
      explanationSource = "template";
    }
  }
  await persistDisk(matchupKey, fighterA, fighterB, prediction, explanationSource, dataQuality);
  return {
    prediction,
    cacheHit: false,
    explanationSource,
    engineVersion: ANALYSIS_ENGINE_VERSION,
    dataQuality,
    persistence: isSupabaseConfigured() ? "supabase" : "disk",
  };
}

/** Sync path for catalog FightView construction (structured only, no LLM). */
export function analyzeFightSync(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContext = { rounds: 3, isTitle: false, division: null },
): Prediction {
  const dataQuality = assessDataQuality(fighterA, fighterB);
  const quality = qualityNote(dataQuality);
  const key = analysisCacheKey(fighterA.id, fighterB.id, context.rounds, context.isTitle);
  const disk = readDiskAnalysisCache(key);
  if (disk && isCacheFresh(disk, fighterA, fighterB)) {
    const prediction =
      disk.fighterAId === fighterA.id
        ? disk.prediction
        : {
            ...disk.prediction,
            fighterAWinPct: disk.prediction.fighterBWinPct,
            fighterBWinPct: disk.prediction.fighterAWinPct,
            keyAdvantages: {
              fighterA: disk.prediction.keyAdvantages.fighterB,
              fighterB: disk.prediction.keyAdvantages.fighterA,
            },
            analysis: {
              howAWins: disk.prediction.analysis.howBWins,
              howBWins: disk.prediction.analysis.howAWins,
              fightscopeRead: disk.prediction.analysis.fightscopeRead,
            },
          };
    return withQualityNote(prediction, quality);
  }

  const prediction = withQualityNote(generateStructured(fighterA, fighterB, context), quality);
  writeDiskAnalysisCache({
    key,
    version: ANALYSIS_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    fighterAId: fighterA.id,
    fighterBId: fighterB.id,
    fighterAFingerprint: fighterFingerprint(fighterA),
    fighterBFingerprint: fighterFingerprint(fighterB),
    prediction,
    explanationSource: "template",
    dataQuality,
    status: "ready",
  });
  return prediction;
}
