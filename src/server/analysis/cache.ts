import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Fighter, Prediction } from "@/lib/types";
import type { AnalysisDataQuality } from "@/server/analysis/data-quality";
import { getSupabaseAdmin } from "@/server/supabase/client";

import { ANALYSIS_ENGINE_VERSION_V4 } from "@/lib/prediction-versions";

export const ANALYSIS_ENGINE_VERSION = ANALYSIS_ENGINE_VERSION_V4;

export interface CachedAnalysis {
  key: string;
  version: string;
  createdAt: string;
  fighterAId: string;
  fighterBId: string;
  fighterAFingerprint: string;
  fighterBFingerprint: string;
  prediction: Prediction;
  explanationSource: "llm" | "template";
  dataQuality?: AnalysisDataQuality;
  status?: "generating" | "ready" | "stale" | "failed";
}

export interface FightAnalysisRow {
  id: string;
  matchup_key: string;
  fighter_a_id: string;
  fighter_b_id: string;
  fighter_low_id: string;
  fighter_high_id: string;
  rounds: number;
  is_title: boolean;
  division: string | null;
  engine_version: string;
  prompt_version: string;
  ai_version: string | null;
  input_hash: string;
  fighter_a_hash: string;
  fighter_b_hash: string;
  structured_prediction: Prediction;
  written_analysis: Prediction["analysis"];
  explanation_source: "llm" | "template" | "none";
  data_quality: AnalysisDataQuality;
  status: "generating" | "ready" | "stale" | "failed";
  error_message: string | null;
  generated_at: string | null;
  claimed_at: string | null;
  claim_token: string | null;
}

function cacheDir(): string {
  return path.join(process.cwd(), ".fightscope-cache", "analysis");
}

function cachePath(key: string): string {
  return path.join(cacheDir(), `${key}.json`);
}

export function fighterFingerprint(fighter: Fighter): string {
  const payload = {
    id: fighter.id,
    record: fighter.record,
    attributes: fighter.attributes,
    statistics: fighter.statistics,
    finishes: fighter.finishes,
    recent: fighter.recentFights.slice(0, 5).map((fight) => [
      fight.date,
      fight.result,
      fight.opponentName,
      fight.method,
    ]),
    ranking: fighter.ranking,
    age: fighter.age,
    reachCm: fighter.reachCm,
  };
  return createHash("sha1").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

/** Canonical ordered ids so A vs B === B vs A. */
export function canonicalFighterPair(fighterAId: string, fighterBId: string): {
  lowId: string;
  highId: string;
} {
  return fighterAId <= fighterBId
    ? { lowId: fighterAId, highId: fighterBId }
    : { lowId: fighterBId, highId: fighterAId };
}

export function analysisCacheKey(
  fighterAId: string,
  fighterBId: string,
  rounds: number,
  isTitle: boolean,
): string {
  const { lowId, highId } = canonicalFighterPair(fighterAId, fighterBId);
  return createHash("sha1")
    .update(`${ANALYSIS_ENGINE_VERSION}:${lowId}:${highId}:${rounds}:${isTitle ? 1 : 0}`)
    .digest("hex")
    .slice(0, 24);
}

export function combinedInputHash(
  fighterA: Fighter,
  fighterB: Fighter,
  rounds: number,
  isTitle: boolean,
): string {
  const { lowId, highId } = canonicalFighterPair(fighterA.id, fighterB.id);
  const low = fighterA.id === lowId ? fighterA : fighterB;
  const high = fighterA.id === highId ? fighterA : fighterB;
  return createHash("sha1")
    .update(
      JSON.stringify({
        engine: ANALYSIS_ENGINE_VERSION,
        low: fighterFingerprint(low),
        high: fighterFingerprint(high),
        rounds,
        isTitle,
      }),
    )
    .digest("hex")
    .slice(0, 24);
}

export function mirrorPredictionForRequestOrder(
  stored: FightAnalysisRow,
  requestAId: string,
): Prediction {
  const prediction: Prediction = {
    ...stored.structured_prediction,
    analysis: stored.written_analysis,
  };
  if (stored.fighter_a_id === requestAId) return prediction;
  return {
    ...prediction,
    fighterAWinPct: prediction.fighterBWinPct,
    fighterBWinPct: prediction.fighterAWinPct,
    keyAdvantages: {
      fighterA: prediction.keyAdvantages.fighterB,
      fighterB: prediction.keyAdvantages.fighterA,
    },
    analysis: {
      howAWins: prediction.analysis.howBWins,
      howBWins: prediction.analysis.howAWins,
      fightscopeRead: prediction.analysis.fightscopeRead,
    },
  };
}

export function readDiskAnalysisCache(key: string): CachedAnalysis | null {
  try {
    const file = cachePath(key);
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf8")) as CachedAnalysis;
  } catch {
    return null;
  }
}

export function writeDiskAnalysisCache(entry: CachedAnalysis): void {
  try {
    mkdirSync(cacheDir(), { recursive: true });
    writeFileSync(cachePath(entry.key), `${JSON.stringify(entry, null, 2)}\n`);
  } catch (error) {
    console.error("FightScope disk analysis cache write failed", error);
  }
}

/** @deprecated use readDiskAnalysisCache — kept for local scripts */
export const readAnalysisCache = readDiskAnalysisCache;
/** @deprecated use writeDiskAnalysisCache */
export const writeAnalysisCache = writeDiskAnalysisCache;

export function isCacheFresh(
  entry: CachedAnalysis,
  fighterA: Fighter,
  fighterB: Fighter,
): boolean {
  if (entry.version !== ANALYSIS_ENGINE_VERSION) return false;
  if (entry.status && entry.status !== "ready") return false;
  const direct =
    entry.fighterAFingerprint === fighterFingerprint(fighterA) &&
    entry.fighterBFingerprint === fighterFingerprint(fighterB);
  const swapped =
    entry.fighterAFingerprint === fighterFingerprint(fighterB) &&
    entry.fighterBFingerprint === fighterFingerprint(fighterA);
  return direct || swapped;
}

export async function fetchReadyAnalysis(
  matchupKey: string,
  inputHash: string,
): Promise<FightAnalysisRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fight_analyses")
    .select("*")
    .eq("matchup_key", matchupKey)
    .eq("engine_version", ANALYSIS_ENGINE_VERSION)
    .eq("status", "ready")
    .eq("input_hash", inputHash)
    .maybeSingle();
  if (error) {
    console.error("Supabase fetchReadyAnalysis failed", error);
    return null;
  }
  return (data as FightAnalysisRow | null) ?? null;
}

export async function fetchAnalysisByKey(matchupKey: string): Promise<FightAnalysisRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fight_analyses")
    .select("*")
    .eq("matchup_key", matchupKey)
    .eq("engine_version", ANALYSIS_ENGINE_VERSION)
    .maybeSingle();
  if (error) {
    console.error("Supabase fetchAnalysisByKey failed", error);
    return null;
  }
  return (data as FightAnalysisRow | null) ?? null;
}

/**
 * Atomically claim generation for a matchup/version.
 * Returns { claimed: true, token } if this caller owns generation.
 * Returns { claimed: false, row } if another row already exists.
 */
export async function claimAnalysisGeneration(input: {
  matchupKey: string;
  fighterA: Fighter;
  fighterB: Fighter;
  rounds: number;
  isTitle: boolean;
  division: string | null;
  inputHash: string;
  promptVersion: string;
  aiVersion: string;
  dataQuality: AnalysisDataQuality;
}): Promise<{ claimed: boolean; token: string | null; row: FightAnalysisRow | null }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { claimed: false, token: null, row: null };

  const { lowId, highId } = canonicalFighterPair(input.fighterA.id, input.fighterB.id);
  const token = randomUUID();
  const now = new Date().toISOString();

  const insertPayload = {
    matchup_key: input.matchupKey,
    fighter_a_id: input.fighterA.id,
    fighter_b_id: input.fighterB.id,
    fighter_low_id: lowId,
    fighter_high_id: highId,
    rounds: input.rounds,
    is_title: input.isTitle,
    division: input.division,
    engine_version: ANALYSIS_ENGINE_VERSION,
    prompt_version: input.promptVersion,
    ai_version: input.aiVersion,
    input_hash: input.inputHash,
    fighter_a_hash: fighterFingerprint(input.fighterA),
    fighter_b_hash: fighterFingerprint(input.fighterB),
    structured_prediction: {},
    written_analysis: {},
    explanation_source: "none",
    data_quality: input.dataQuality,
    status: "generating",
    claimed_at: now,
    claim_token: token,
    updated_at: now,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("fight_analyses")
    .insert(insertPayload)
    .select("*")
    .maybeSingle();

  if (!insertError && inserted) {
    return { claimed: true, token, row: inserted as FightAnalysisRow };
  }

  // Unique violation or race — load existing and maybe reclaim stale/failed/expired claim.
  const existing = await fetchAnalysisByKey(input.matchupKey);
  if (!existing) return { claimed: false, token: null, row: null };

  const claimExpired =
    existing.status === "generating" &&
    existing.claimed_at &&
    Date.now() - Date.parse(existing.claimed_at) > 45_000;

  const reclaimable =
    existing.status === "stale" ||
    existing.status === "failed" ||
    claimExpired ||
    (existing.status === "ready" && existing.input_hash !== input.inputHash);

  if (reclaimable) {
    const { data: updated, error: updateError } = await supabase
      .from("fight_analyses")
      .update({
        fighter_a_id: input.fighterA.id,
        fighter_b_id: input.fighterB.id,
        rounds: input.rounds,
        is_title: input.isTitle,
        division: input.division,
        prompt_version: input.promptVersion,
        ai_version: input.aiVersion,
        input_hash: input.inputHash,
        fighter_a_hash: fighterFingerprint(input.fighterA),
        fighter_b_hash: fighterFingerprint(input.fighterB),
        data_quality: input.dataQuality,
        status: "generating",
        error_message: null,
        claimed_at: now,
        claim_token: token,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("status", existing.status)
      .eq("input_hash", existing.input_hash)
      .select("*")
      .maybeSingle();

    if (!updateError && updated && (updated as FightAnalysisRow).claim_token === token) {
      return { claimed: true, token, row: updated as FightAnalysisRow };
    }
  }

  return { claimed: false, token: null, row: existing };
}

export async function completeAnalysisGeneration(input: {
  matchupKey: string;
  claimToken: string;
  prediction: Prediction;
  explanationSource: "llm" | "template";
  dataQuality: AnalysisDataQuality;
  promptVersion: string;
  aiVersion: string;
}): Promise<FightAnalysisRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("fight_analyses")
    .update({
      structured_prediction: input.prediction,
      written_analysis: input.prediction.analysis,
      explanation_source: input.explanationSource,
      data_quality: input.dataQuality,
      prompt_version: input.promptVersion,
      ai_version: input.aiVersion,
      status: "ready",
      generated_at: now,
      updated_at: now,
      error_message: null,
      claim_token: null,
    })
    .eq("matchup_key", input.matchupKey)
    .eq("engine_version", ANALYSIS_ENGINE_VERSION)
    .eq("claim_token", input.claimToken)
    .eq("status", "generating")
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("Supabase completeAnalysisGeneration failed", error);
    return null;
  }
  return (data as FightAnalysisRow | null) ?? null;
}

export async function failAnalysisGeneration(
  matchupKey: string,
  claimToken: string,
  message: string,
  partialPrediction?: Prediction,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase
    .from("fight_analyses")
    .update({
      status: partialPrediction ? "ready" : "failed",
      structured_prediction: partialPrediction ?? {},
      written_analysis: partialPrediction?.analysis ?? {},
      explanation_source: partialPrediction ? "template" : "none",
      error_message: message,
      generated_at: partialPrediction ? now : null,
      updated_at: now,
      claim_token: null,
    })
    .eq("matchup_key", matchupKey)
    .eq("engine_version", ANALYSIS_ENGINE_VERSION)
    .eq("claim_token", claimToken);
}

export async function markAnalysesStaleForFighter(
  fighterId: string,
  reason: string,
): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("fight_analyses")
    .update({ status: "stale", updated_at: now, error_message: reason })
    .eq("status", "ready")
    .or(`fighter_low_id.eq.${fighterId},fighter_high_id.eq.${fighterId}`)
    .select("id");
  if (error) {
    console.error("markAnalysesStaleForFighter failed", error);
    return 0;
  }
  return data?.length ?? 0;
}

export async function recordAnalysisRun(input: {
  matchupKey?: string | null;
  fightAnalysisId?: string | null;
  runType: string;
  triggerSource: string;
  status: "started" | "succeeded" | "failed" | "skipped";
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("analysis_runs").insert({
    matchup_key: input.matchupKey ?? null,
    fight_analysis_id: input.fightAnalysisId ?? null,
    run_type: input.runType,
    trigger_source: input.triggerSource,
    engine_version: ANALYSIS_ENGINE_VERSION,
    status: input.status,
    details: input.details ?? {},
  });
}

export async function upsertFighterStatSnapshot(
  fighter: Fighter,
  dataQuality: AnalysisDataQuality,
): Promise<{ changed: boolean; previousHash: string | null }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { changed: false, previousHash: null };
  const inputHash = fighterFingerprint(fighter);
  const { data: existing } = await supabase
    .from("fighter_stat_snapshots")
    .select("input_hash")
    .eq("fighter_id", fighter.id)
    .maybeSingle();
  const previousHash = (existing?.input_hash as string | undefined) ?? null;
  const changed = previousHash !== inputHash;
  await supabase.from("fighter_stat_snapshots").upsert({
    fighter_id: fighter.id,
    input_hash: inputHash,
    statistics: fighter.statistics,
    attributes: fighter.attributes,
    record: fighter.record,
    finishes: fighter.finishes,
    recent_fights: fighter.recentFights.slice(0, 5),
    ranking: fighter.ranking,
    age: fighter.age,
    reach_cm: fighter.reachCm,
    data_quality: dataQuality,
    source: "espn-ufc",
    updated_at: new Date().toISOString(),
  });
  return { changed, previousHash };
}

export async function waitForReadyAnalysis(
  matchupKey: string,
  inputHash: string,
  timeoutMs = 40000,
): Promise<FightAnalysisRow | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const row = await fetchAnalysisByKey(matchupKey);
    if (!row) return null;
    if (row.status === "ready" && row.input_hash === inputHash) return row;
    if (row.status === "failed") return null;
    if (row.status === "ready" && row.input_hash !== inputHash) return null;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}
