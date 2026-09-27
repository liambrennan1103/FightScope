import { PREDICTION_DATA_SNAPSHOT_VERSION } from "@/lib/prediction-versions";
import type { Fighter, Prediction } from "@/lib/types";

export type AnalysisHistoryPortrait = {
  src: string | null;
  objectPosition?: string;
  status?: string;
} | null;

/** pre_fight = immutable archive; retrospective = post-completion curiosity run (never pretends pre-fight). */
export type AnalysisHistoryKind = "pre_fight" | "retrospective";

export type AnalysisHistoryItem = {
  id: string;
  fighterAId: string;
  fighterBId: string;
  fighterASlug: string;
  fighterBSlug: string;
  fighterAName: string;
  fighterBName: string;
  fighterAPortrait: AnalysisHistoryPortrait;
  fighterBPortrait: AnalysisHistoryPortrait;
  /** Frozen fighter stats at generation time — preferred over live catalog for History UI. */
  fighterASnapshot?: Fighter;
  fighterBSnapshot?: Fighter;
  eventName?: string;
  eventDate?: string;
  fightSlug?: string;
  division?: string | null;
  rounds?: 3 | 5;
  predictedWinnerId: string;
  fighterAWinPct: number;
  fighterBWinPct: number;
  confidence: Prediction["confidence"];
  /** Frozen prediction blob — never mutated after write. */
  prediction: Prediction;
  createdAt: string;
  /** Alias of createdAt for audit clarity. */
  generatedAt: string;
  kind: AnalysisHistoryKind;
  modelVersion?: string;
  featureVersion?: string;
  dataSnapshotVersion?: string;
  analysisVersion: number;
};

const STORAGE_KEY = "fightscope:analysis-history";
const MAX_ITEMS = 40;

function portraitFromFighter(fighter: Fighter): AnalysisHistoryPortrait {
  return {
    src: fighter.portrait.src,
    objectPosition: fighter.portrait.objectPosition,
    status: fighter.portrait.status,
  };
}

/** Structured clone so later catalog mutations cannot rewrite History. */
function snapshotFighter(fighter: Fighter): Fighter {
  try {
    return structuredClone(fighter);
  } catch {
    return JSON.parse(JSON.stringify(fighter)) as Fighter;
  }
}

function readAll(): AnalysisHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as AnalysisHistoryItem[]).map(normalizeItem);
  } catch {
    return [];
  }
}

/** Back-compat for items saved before kind / snapshot fields existed. */
function normalizeItem(item: AnalysisHistoryItem): AnalysisHistoryItem {
  const generatedAt = item.generatedAt || item.createdAt;
  return {
    ...item,
    generatedAt,
    kind: item.kind ?? "pre_fight",
    analysisVersion: item.analysisVersion ?? 1,
    modelVersion: item.modelVersion ?? item.prediction?.modelVersion,
    featureVersion: item.featureVersion ?? item.prediction?.featureVersion,
    dataSnapshotVersion: item.dataSnapshotVersion ?? PREDICTION_DATA_SNAPSHOT_VERSION,
  };
}

function writeAll(items: AnalysisHistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/**
 * Trim to MAX_ITEMS without silently destroying the oldest pre-fight archives first.
 * Drop oldest retrospectives, then oldest pre_fight only if still over cap.
 */
function trimPreservingPreFight(items: AnalysisHistoryItem[]): AnalysisHistoryItem[] {
  if (items.length <= MAX_ITEMS) return items;
  const kept = [...items];
  while (kept.length > MAX_ITEMS) {
    let dropIdx = -1;
    for (let i = kept.length - 1; i >= 0; i -= 1) {
      if ((kept[i]!.kind ?? "pre_fight") === "retrospective") {
        dropIdx = i;
        break;
      }
    }
    if (dropIdx < 0) dropIdx = kept.length - 1;
    kept.splice(dropIdx, 1);
  }
  return kept;
}

function matchupKey(item: {
  fightSlug?: string;
  fighterAId: string;
  fighterBId: string;
}): string {
  if (item.fightSlug) return `fight:${item.fightSlug}`;
  const [a, b] = [item.fighterAId, item.fighterBId].sort();
  return `pair:${a}:${b}`;
}

export function listHistory(): AnalysisHistoryItem[] {
  return readAll();
}

export function getHistoryItem(id: string): AnalysisHistoryItem | null {
  return readAll().find((item) => item.id === id) ?? null;
}

export function removeHistoryItem(id: string): void {
  writeAll(readAll().filter((item) => item.id !== id));
}

/**
 * Prefer the newest pre-fight archive for a matchup (fight-page restore after re-analyze).
 * Older pre-fight versions remain in History by id and are never mutated.
 * Falls back to most recent retrospective if only those exist.
 */
export function findHistoryItem(opts: {
  fightSlug?: string;
  fighterAId?: string;
  fighterBId?: string;
}): AnalysisHistoryItem | null {
  const items = readAll();
  let matched: AnalysisHistoryItem[] = [];

  if (opts.fightSlug) {
    matched = items.filter((item) => item.fightSlug === opts.fightSlug);
  } else if (opts.fighterAId && opts.fighterBId) {
    matched = items.filter(
      (item) =>
        (item.fighterAId === opts.fighterAId && item.fighterBId === opts.fighterBId) ||
        (item.fighterAId === opts.fighterBId && item.fighterBId === opts.fighterAId),
    );
  }

  if (!matched.length) return null;

  const preFight = matched
    .filter((item) => (item.kind ?? "pre_fight") === "pre_fight")
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  if (preFight[0]) return preFight[0];

  // items are newest-first
  return matched[0] ?? null;
}

export function listHistoryForMatchup(opts: {
  fightSlug?: string;
  fighterAId?: string;
  fighterBId?: string;
}): AnalysisHistoryItem[] {
  const items = readAll();
  if (opts.fightSlug) {
    return items.filter((item) => item.fightSlug === opts.fightSlug);
  }
  if (opts.fighterAId && opts.fighterBId) {
    return items.filter(
      (item) =>
        (item.fighterAId === opts.fighterAId && item.fighterBId === opts.fighterBId) ||
        (item.fighterAId === opts.fighterBId && item.fighterBId === opts.fighterAId),
    );
  }
  return [];
}

/**
 * Append a new frozen analysis. Never mutates an existing item's prediction blob.
 * Pre-fight rows for the same matchup are kept (versioned). Prior retrospectives
 * for the same matchup are replaced so curiosity runs don't spam History.
 */
export function saveAnalysisToHistory(input: {
  fighterA: Fighter;
  fighterB: Fighter;
  prediction: Prediction;
  eventName?: string;
  eventDate?: string;
  fightSlug?: string;
  division?: string | null;
  rounds?: 3 | 5;
  /** When true, saved as retrospective — never labeled as a pre-fight pick. */
  fightCompleted?: boolean;
}): AnalysisHistoryItem {
  const {
    fighterA,
    fighterB,
    prediction,
    eventName,
    eventDate,
    fightSlug,
    division,
    rounds,
    fightCompleted = false,
  } = input;

  const kind: AnalysisHistoryKind = fightCompleted ? "retrospective" : "pre_fight";
  const now = new Date().toISOString();
  const existing = readAll();
  const key = matchupKey({
    fightSlug,
    fighterAId: fighterA.id,
    fighterBId: fighterB.id,
  });

  const sameMatchup = existing.filter((item) => matchupKey(item) === key);
  const analysisVersion =
    sameMatchup.reduce((max, item) => Math.max(max, item.analysisVersion ?? 1), 0) + 1;

  const item: AnalysisHistoryItem = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${fighterA.id}:${fighterB.id}:${Date.now()}`,
    fighterAId: fighterA.id,
    fighterBId: fighterB.id,
    fighterASlug: fighterA.slug,
    fighterBSlug: fighterB.slug,
    fighterAName: fighterA.name,
    fighterBName: fighterB.name,
    fighterAPortrait: portraitFromFighter(fighterA),
    fighterBPortrait: portraitFromFighter(fighterB),
    fighterASnapshot: snapshotFighter(fighterA),
    fighterBSnapshot: snapshotFighter(fighterB),
    eventName,
    eventDate,
    fightSlug,
    division: division ?? fighterA.division ?? fighterB.division ?? null,
    rounds,
    predictedWinnerId: prediction.predictedWinnerId,
    fighterAWinPct: prediction.fighterAWinPct,
    fighterBWinPct: prediction.fighterBWinPct,
    confidence: prediction.confidence,
    prediction,
    createdAt: now,
    generatedAt: now,
    kind,
    modelVersion: prediction.modelVersion,
    featureVersion: prediction.featureVersion,
    dataSnapshotVersion: PREDICTION_DATA_SNAPSHOT_VERSION,
    analysisVersion,
  };

  // Keep every pre_fight archive. Replace prior retrospectives for this matchup only.
  const rest = existing.filter((existingItem) => {
    if (matchupKey(existingItem) !== key) return true;
    if ((existingItem.kind ?? "pre_fight") === "pre_fight") return true;
    // Drop older retrospective for same matchup when saving a new one.
    return kind === "pre_fight";
  });

  writeAll(trimPreservingPreFight([item, ...rest]));
  return item;
}

/** True when this History row is an immutable pre-fight archive. */
export function isPreFightHistory(item: AnalysisHistoryItem): boolean {
  return (item.kind ?? "pre_fight") === "pre_fight";
}
