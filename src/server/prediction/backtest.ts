/**
 * Deterministic historical backtest — snapshot.json only (no live ESPN).
 *
 * Corpus:
 * - Winner metrics: matched recentFights pairs (~400+)
 * - Method metrics: catalog completed fights with method labels (+ catalog→recent join)
 *
 * Chronological split: train 50% / validation 15% / test 35% (expanded holdout).
 * Promotion requires beating Elo + as-of record baselines on Brier, log loss, and ECE —
 * accuracy alone is not sufficient.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Fighter, MmaCatalog } from "@/lib/types";
import { boutsAsOf, careerRecordAsOf, classifyMethod } from "@/server/prediction/as-of";
import { defaultArtifactMeta, saveModelArtifact } from "@/server/prediction/artifacts";
import {
  brierBinary,
  expectedCalibrationError,
  logLossBinary,
  setCalibration,
  type CalibrationParams,
} from "@/server/prediction/calibrate";
import { fitBaseRates, getLiveBaseRates, setLiveBaseRates } from "@/server/prediction/base-rates";
import { buildEloHistory, ELO_DEFAULT, expectedScore, type EloTable } from "@/server/prediction/elo";
import {
  predictFightStructural,
  setLiveEloTable,
  setLivePlatt,
} from "@/server/prediction/engine";
import { fitPlatt } from "@/server/prediction/platt";
import {
  PREDICTION_CALIBRATION_VERSION,
  PREDICTION_DATA_SNAPSHOT_VERSION,
  PREDICTION_FEATURE_VERSION,
  PREDICTION_MODEL_VERSION,
} from "@/server/prediction/versions";

/** Min as-of pro bouts (either side) to count as low-sample diagnostic. */
const LOW_SAMPLE_BOUTS = 10;

/** Historical v3 report used for explicit head-to-head (same snapshot era). */
const V3_REFERENCE_REPORT = path.join(
  process.cwd(),
  "reports/backtest/2026-09-06T17-54-06-784Z/summary.json",
);

let ACTIVE_ELO: EloTable | null = null;

type WinnerCase = {
  key: string;
  date: string;
  fighterA: Fighter;
  fighterB: Fighter;
  winnerId: string;
  rounds: 3 | 5;
  isTitle: boolean;
  division: string | null;
  isWomens: boolean;
  source: "catalog" | "recent";
};

type MethodCase = WinnerCase & {
  method: "ko" | "sub" | "dec";
};

function isWomensDivision(division: string | null): boolean {
  const d = (division ?? "").toLowerCase();
  return d.includes("women") || d.startsWith("w ");
}

function loadCatalog(): { catalog: MmaCatalog; snapshotPath: string; snapshotHash: string; lastUpdated: string | null } {
  const snapshotPath = path.join(process.cwd(), "src/server/mma/snapshot.json");
  const raw = readFileSync(snapshotPath, "utf8");
  const catalog = JSON.parse(raw) as MmaCatalog;
  const snapshotHash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return {
    catalog,
    snapshotPath,
    snapshotHash,
    lastUpdated: catalog.lastUpdated ?? null,
  };
}

/**
 * Index catalog completed fights by unordered fighter pair + calendar day → method.
 * Used to attach method labels onto recentFights pairs without calling ESPN.
 */
function catalogMethodIndex(catalog: MmaCatalog): Map<string, "ko" | "sub" | "dec"> {
  const events = new Map(catalog.events.map((e) => [e.id, e]));
  const idx = new Map<string, "ko" | "sub" | "dec">();
  for (const fight of catalog.fights) {
    if (fight.status !== "completed" || !fight.outcome?.method || !fight.outcome.winnerId) continue;
    const method = classifyMethod(fight.outcome.method);
    if (method === "other") continue;
    const event = events.get(fight.eventId);
    if (!event?.date) continue;
    const day = event.date.slice(0, 10);
    const key = [fight.fighterAId, fight.fighterBId, day].sort().join("|");
    idx.set(key, method === "ko" ? "ko" : method === "sub" ? "sub" : "dec");
  }
  return idx;
}

function buildCatalogMethodCases(catalog: MmaCatalog): MethodCase[] {
  const fighters = new Map(catalog.fighters.map((f) => [f.id, f]));
  const events = new Map(catalog.events.map((e) => [e.id, e]));
  const out: MethodCase[] = [];

  for (const fight of catalog.fights) {
    if (fight.status !== "completed" || !fight.outcome?.method) continue;
    const method = classifyMethod(fight.outcome.method);
    if (method === "other") continue;
    const a = fighters.get(fight.fighterAId);
    const b = fighters.get(fight.fighterBId);
    const event = events.get(fight.eventId);
    if (!a || !b || !event?.date || !fight.outcome.winnerId) continue;
    out.push({
      key: `catalog:${fight.id}`,
      date: event.date,
      fighterA: a,
      fighterB: b,
      winnerId: fight.outcome.winnerId,
      rounds: fight.rounds,
      isTitle: fight.isTitle,
      division: fight.division,
      isWomens: isWomensDivision(fight.division),
      source: "catalog",
      method: method === "ko" ? "ko" : method === "sub" ? "sub" : "dec",
    });
  }
  return out.sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
}

/**
 * Expand method-labeled corpus: catalog fights + recent pairs whose method can be
 * recovered from the local catalog index (still zero live network).
 */
function buildExpandedMethodCases(catalog: MmaCatalog): MethodCase[] {
  const methodIdx = catalogMethodIndex(catalog);
  const byKey = new Map<string, MethodCase>();

  for (const c of buildCatalogMethodCases(catalog)) {
    const day = c.date.slice(0, 10);
    const pairKey = [c.fighterA.id, c.fighterB.id, day].sort().join("|");
    byKey.set(pairKey, c);
  }

  // Attach catalog methods onto matched recent pairs (deduped).
  for (const c of buildRecentWinnerCases(catalog)) {
    const day = c.date.slice(0, 10);
    const pairKey = [c.fighterA.id, c.fighterB.id, day].sort().join("|");
    const method = methodIdx.get(pairKey);
    if (!method) continue;
    if (byKey.has(pairKey)) continue;
    byKey.set(pairKey, {
      ...c,
      key: `recent-method:${pairKey}`,
      source: "recent",
      method,
    });
  }

  return [...byKey.values()].sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
}

function buildRecentWinnerCases(catalog: MmaCatalog): WinnerCase[] {
  const bySlug = new Map(catalog.fighters.map((f) => [f.slug, f]));
  const byName = new Map(catalog.fighters.map((f) => [f.name.toLowerCase(), f]));
  const seen = new Set<string>();
  const out: WinnerCase[] = [];

  for (const f of catalog.fighters) {
    for (const rf of f.recentFights ?? []) {
      if (rf.result !== "W" && rf.result !== "L") continue;
      let opp = rf.opponentSlug ? bySlug.get(rf.opponentSlug) : undefined;
      if (!opp) opp = byName.get((rf.opponentName || "").toLowerCase());
      if (!opp || opp.id === f.id) continue;
      const day = rf.date.slice(0, 10);
      const key = [f.id, opp.id, day].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      // Canonical order: lower id as A
      const [fighterA, fighterB] = f.id < opp.id ? [f, opp] : [opp, f];
      const actualWinner = rf.result === "W" ? f.id : opp.id;

      out.push({
        key: `recent:${key}`,
        date: rf.date,
        fighterA,
        fighterB,
        winnerId: actualWinner,
        rounds: 3,
        isTitle: false,
        division: fighterA.division ?? fighterB.division,
        isWomens: isWomensDivision(fighterA.division ?? fighterB.division),
        source: "recent",
      });
    }
  }
  return out.sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
}

/** Expanded holdout: train 50% / val 15% / test 35%. */
function chronoSplit<T extends { date: string }>(
  rows: T[],
): { train: T[]; validation: T[]; test: T[] } {
  const n = rows.length;
  const iTrain = Math.floor(n * 0.5);
  const iVal = Math.floor(n * 0.65);
  return {
    train: rows.slice(0, iTrain),
    validation: rows.slice(iTrain, iVal),
    test: rows.slice(iVal),
  };
}

function predictCase(c: WinnerCase, leakMethod?: string | null) {
  return predictFightStructural(
    c.fighterA,
    c.fighterB,
    {
      rounds: c.rounds,
      isTitle: c.isTitle,
      division: c.division,
      asOf: c.date,
    },
    {
      leakOutcome: {
        winnerId: c.winnerId,
        method: leakMethod ?? null,
        fighterAId: c.fighterA.id,
        fighterBId: c.fighterB.id,
      },
      eloTable: ACTIVE_ELO,
    },
  );
}

function evaluateWinner(rows: WinnerCase[]) {
  let correct = 0;
  let brier = 0;
  let logloss = 0;
  const calRows: Array<{ p: number; y: 0 | 1 }> = [];
  const byCoverage = {
    HIGH: { n: 0, correct: 0 },
    MEDIUM: { n: 0, correct: 0 },
    LOW: { n: 0, correct: 0 },
  };

  for (const c of rows) {
    const p = predictCase(c);
    const pA = p.winner.fighterAWinPct / 100;
    const yA: 0 | 1 = c.winnerId === c.fighterA.id ? 1 : 0;
    const predId =
      p.predictedWinnerSide === "A"
        ? c.fighterA.id
        : p.predictedWinnerSide === "B"
          ? c.fighterB.id
          : p.winner.fighterAWinPct >= p.winner.fighterBWinPct
            ? c.fighterA.id
            : c.fighterB.id;
    if (predId === c.winnerId) correct += 1;
    brier += brierBinary(pA, yA);
    logloss += logLossBinary(pA, yA);
    const favP = Math.max(pA, 1 - pA);
    const favY: 0 | 1 =
      (pA >= 0.5 && yA === 1) || (pA < 0.5 && yA === 0) ? 1 : 0;
    calRows.push({ p: favP, y: favY });
    const bucket = byCoverage[p.coverage.level];
    bucket.n += 1;
    if (predId === c.winnerId) bucket.correct += 1;
  }

  const n = rows.length || 1;
  const { ece, buckets } = expectedCalibrationError(calRows);
  return {
    n: rows.length,
    accuracy: correct / n,
    brier: brier / n,
    logloss: logloss / n,
    ece,
    calibrationBuckets: buckets,
    byCoverage: Object.fromEntries(
      Object.entries(byCoverage).map(([k, v]) => [
        k,
        { n: v.n, accuracy: v.n ? v.correct / v.n : null },
      ]),
    ),
  };
}

function evaluateMethods(rows: MethodCase[]) {
  const predDist = { ko: 0, sub: 0, dec: 0 };
  const actDist = { ko: 0, sub: 0, dec: 0 };
  let exact = 0;
  let finishVsDec = 0;
  const confusion = {
    ko: { ko: 0, sub: 0, dec: 0 },
    sub: { ko: 0, sub: 0, dec: 0 },
    dec: { ko: 0, sub: 0, dec: 0 },
  };
  let decPred = 0;
  let decAct = 0;
  let decTp = 0;
  let decFp = 0;
  let decFn = 0;

  const byRounds = {
    r3: { n: 0, exact: 0 },
    r5: { n: 0, exact: 0 },
  };

  for (const c of rows) {
    const p = predictCase(c, c.method === "ko" ? "KO/TKO" : c.method === "sub" ? "Submission" : "Decision");
    const methods = p.methods;
    predDist.ko += methods.koTko;
    predDist.sub += methods.submission;
    predDist.dec += methods.decision;
    actDist[c.method] += 1;

    const predMethod =
      methods.koTko >= methods.submission && methods.koTko >= methods.decision
        ? "ko"
        : methods.submission >= methods.decision
          ? "sub"
          : "dec";

    confusion[c.method][predMethod] += 1;
    if (predMethod === c.method) exact += 1;

    const actFinish = c.method !== "dec";
    const predFinish = predMethod !== "dec";
    if (actFinish === predFinish) finishVsDec += 1;

    if (predMethod === "dec") decPred += 1;
    if (c.method === "dec") decAct += 1;
    if (predMethod === "dec" && c.method === "dec") decTp += 1;
    if (predMethod === "dec" && c.method !== "dec") decFp += 1;
    if (predMethod !== "dec" && c.method === "dec") decFn += 1;

    const rk = c.rounds === 5 ? byRounds.r5 : byRounds.r3;
    rk.n += 1;
    if (predMethod === c.method) rk.exact += 1;
  }

  const n = rows.length || 1;
  const predAvg = {
    koTko: predDist.ko / n / 100,
    submission: predDist.sub / n / 100,
    decision: predDist.dec / n / 100,
  };
  const actAvg = {
    koTko: actDist.ko / n,
    submission: actDist.sub / n,
    decision: actDist.dec / n,
  };

  return {
    n: rows.length,
    exactMethodAccuracy: exact / n,
    finishVsDecisionAccuracy: finishVsDec / n,
    predictedDistribution: predAvg,
    actualDistribution: actAvg,
    decisionBiasPp: (predAvg.decision - actAvg.decision) * 100,
    decisionPrecision: decPred ? decTp / decPred : null,
    decisionRecall: decAct ? decTp / decAct : null,
    decisionFalsePositiveRate: n - decAct ? decFp / (n - decAct) : null,
    confusion,
    byRounds: {
      rounds3: {
        n: byRounds.r3.n,
        exactMethodAccuracy: byRounds.r3.n ? byRounds.r3.exact / byRounds.r3.n : null,
      },
      rounds5: {
        n: byRounds.r5.n,
        exactMethodAccuracy: byRounds.r5.n ? byRounds.r5.exact / byRounds.r5.n : null,
      },
    },
  };
}

function fitTemperature(validation: WinnerCase[]): CalibrationParams {
  let best: CalibrationParams = { temperature: 1.15, shrinkStrength: 0.55 };
  let bestScore = Infinity;
  for (const temperature of [0.85, 1.0, 1.15, 1.35, 1.6]) {
    for (const shrinkStrength of [0.35, 0.55, 0.7]) {
      setCalibration({ temperature, shrinkStrength });
      const metrics = evaluateWinner(validation);
      const score = metrics.logloss + metrics.ece;
      if (score < bestScore) {
        bestScore = score;
        best = { temperature, shrinkStrength };
      }
    }
  }
  setCalibration(best);
  return best;
}

const SMOKE_PAIRS: Array<[string, string]> = [
  ["dan-hooker", "salahdine-parnasse"],
  ["delphine-benouaich", "sofia-montenegro"],
  ["matthieu-letho-duclos", "luis-felipe-dias"],
  ["oumar-sy", "modestas-bukauskas"],
  ["losene-keita", "muhammad-naimov"],
  ["morgan-charriere", "andre-lima"],
  ["morgan-charriere", "felipe-lima"],
  ["morgan-charriere", "douglas-lima"],
];

function smokeTest(catalog: MmaCatalog) {
  const fighters = new Map(catalog.fighters.map((f) => [f.slug, f]));
  const events = new Map(catalog.events.map((e) => [e.id, e]));
  const reports = [];
  const seen = new Set<string>();

  for (const [slugA, slugB] of SMOKE_PAIRS) {
    const a = fighters.get(slugA);
    const b = fighters.get(slugB);
    if (!a || !b) continue;
    const fight = catalog.fights.find(
      (f) =>
        (f.fighterAId === a.id && f.fighterBId === b.id) ||
        (f.fighterAId === b.id && f.fighterBId === a.id),
    );
    if (!fight || seen.has(fight.id)) continue;
    seen.add(fight.id);
    const event = events.get(fight.eventId);
    const orderedA = fight.fighterAId === a.id ? a : b;
    const orderedB = fight.fighterAId === a.id ? b : a;
    const pred = predictFightStructural(orderedA, orderedB, {
      rounds: fight.rounds,
      isTitle: fight.isTitle,
      division: fight.division,
      asOf: event?.date ?? new Date().toISOString(),
    });
    reports.push({
      fight: `${orderedA.lastName} vs ${orderedB.lastName}`,
      slug: fight.slug,
      status: fight.status,
      predictedWinner:
        pred.predictedWinnerSide === "A"
          ? orderedA.lastName
          : pred.predictedWinnerSide === "B"
            ? orderedB.lastName
            : "Draw",
      winPct: {
        A: pred.winner.fighterAWinPct,
        B: pred.winner.fighterBWinPct,
      },
      methods: pred.methods,
      mostLikelyPath: pred.mostLikelyPath.label,
      mostLikelyPct: pred.mostLikelyPath.pct,
      coverage: pred.coverage.level,
      // Actuals only if completed — never used for fitting
      actualWinnerId: fight.outcome?.winnerId ?? null,
      actualMethod: fight.outcome?.method ?? null,
    });
  }
  return reports;
}

function baselineAlwaysFavorite(rows: WinnerCase[]) {
  // Leakage-safe baseline: higher pre-fight form3 from recentFights before asOf
  let correct = 0;
  for (const c of rows) {
    const asOfMs = Date.parse(c.date);
    const form = (f: Fighter) => {
      const recent = (f.recentFights ?? []).filter((rf) => Date.parse(rf.date) < asOfMs);
      const slice = recent.slice(0, 3);
      if (!slice.length) return 0.5;
      return slice.filter((r) => r.result === "W").length / slice.length;
    };
    const pred = form(c.fighterA) >= form(c.fighterB) ? c.fighterA.id : c.fighterB.id;
    if (pred === c.winnerId) correct += 1;
  }
  return { n: rows.length, accuracy: rows.length ? correct / rows.length : 0, name: "preFightForm3" };
}

function baselineRecord(rows: WinnerCase[]) {
  // Strict pre-fight career win rates via careerRecordAsOf (undo post-asOf recent).
  let correct = 0;
  let brier = 0;
  let logloss = 0;
  const calRows: Array<{ p: number; y: 0 | 1 }> = [];
  for (const c of rows) {
    const wr = (f: Fighter) => {
      const r = careerRecordAsOf(f, c.date);
      const d = Math.max(1, r.wins + r.losses);
      return r.wins / d;
    };
    const pA = wr(c.fighterA) / (wr(c.fighterA) + wr(c.fighterB) || 1);
    const yA: 0 | 1 = c.winnerId === c.fighterA.id ? 1 : 0;
    const pred = pA >= 0.5 ? c.fighterA.id : c.fighterB.id;
    if (pred === c.winnerId) correct += 1;
    brier += brierBinary(pA, yA);
    logloss += logLossBinary(pA, yA);
    const favP = Math.max(pA, 1 - pA);
    const favY: 0 | 1 =
      (pA >= 0.5 && yA === 1) || (pA < 0.5 && yA === 0) ? 1 : 0;
    calRows.push({ p: favP, y: favY });
  }
  const n = rows.length || 1;
  const { ece } = expectedCalibrationError(calRows);
  return {
    n: rows.length,
    accuracy: correct / n,
    brier: brier / n,
    logloss: logloss / n,
    ece,
    name: "recordWinRateAsOf",
  };
}

function baselineEloOnly(rows: WinnerCase[], eloHistory: ReturnType<typeof buildEloHistory>) {
  let correct = 0;
  let brier = 0;
  let logloss = 0;
  const calRows: Array<{ p: number; y: 0 | 1 }> = [];
  for (const c of rows) {
    const table = eloHistory.ratingsBefore(c.date);
    const ra = table.get(c.fighterA.id) ?? ELO_DEFAULT;
    const rb = table.get(c.fighterB.id) ?? ELO_DEFAULT;
    const pA = expectedScore(ra, rb);
    const yA: 0 | 1 = c.winnerId === c.fighterA.id ? 1 : 0;
    const pred = pA >= 0.5 ? c.fighterA.id : c.fighterB.id;
    if (pred === c.winnerId) correct += 1;
    brier += brierBinary(pA, yA);
    logloss += logLossBinary(pA, yA);
    const favP = Math.max(pA, 1 - pA);
    const favY: 0 | 1 =
      (pA >= 0.5 && yA === 1) || (pA < 0.5 && yA === 0) ? 1 : 0;
    calRows.push({ p: favP, y: favY });
  }
  const n = rows.length || 1;
  const { ece } = expectedCalibrationError(calRows);
  return {
    n: rows.length,
    accuracy: correct / n,
    brier: brier / n,
    logloss: logloss / n,
    ece,
    name: "eloOnly",
  };
}

function minBoutsAsOf(c: WinnerCase): number {
  return Math.min(boutsAsOf(c.fighterA, c.date), boutsAsOf(c.fighterB, c.date));
}

function collectWinnerRows(rows: WinnerCase[]) {
  return rows.map((c) => {
    const p = predictCase(c);
    const pA = p.winner.fighterAWinPct / 100;
    const yA: 0 | 1 = c.winnerId === c.fighterA.id ? 1 : 0;
    const predId =
      p.predictedWinnerSide === "A"
        ? c.fighterA.id
        : p.predictedWinnerSide === "B"
          ? c.fighterB.id
          : p.winner.fighterAWinPct >= p.winner.fighterBWinPct
            ? c.fighterA.id
            : c.fighterB.id;
    const favP = Math.max(pA, 1 - pA);
    return {
      c,
      p,
      pA,
      yA,
      predId,
      correct: predId === c.winnerId,
      favP,
      lowSample: minBoutsAsOf(c) < LOW_SAMPLE_BOUTS,
    };
  });
}

export async function runBacktest() {
  const { catalog, snapshotPath, snapshotHash, lastUpdated } = loadCatalog();
  const methodCases = buildExpandedMethodCases(catalog);
  const winnerCases = buildRecentWinnerCases(catalog);

  // Elo from chronological winner corpus (pre-fight ratings only)
  const eloHistory = buildEloHistory(
    winnerCases.map((c) => ({
      date: c.date,
      fighterAId: c.fighterA.id,
      fighterBId: c.fighterB.id,
      winnerId: c.winnerId,
    })),
  );

  // Fit method base rates on train method cases only
  const methodSplit = chronoSplit(methodCases);
  setLiveBaseRates(
    fitBaseRates(
      methodSplit.train.map((c) => ({
        method: c.method,
        rounds: c.rounds,
        isWomens: c.isWomens,
      })),
    ),
  );

  const winnerSplit = chronoSplit(winnerCases);
  setLiveEloTable(null);

  const calibration = fitTemperature(winnerSplit.validation);
  setCalibration(calibration);

  // Fit Platt on validation predictions (never on test)
  const valPlattRows = winnerSplit.validation.map((c) => {
    ACTIVE_ELO = eloHistory.ratingsBefore(c.date);
    const p = predictCase(c);
    return {
      p: p.winner.fighterAWinPct / 100,
      y: (c.winnerId === c.fighterA.id ? 1 : 0) as 0 | 1,
    };
  });
  const platt = fitPlatt(valPlattRows);
  setLivePlatt(platt);

  // Evaluate with Elo as-of + Platt
  function evalWithElo(rows: WinnerCase[]) {
    const prev = ACTIVE_ELO;
    let correct = 0;
    let brier = 0;
    let logloss = 0;
    const calRows: Array<{ p: number; y: 0 | 1 }> = [];
    const byCoverage = {
      HIGH: { n: 0, correct: 0 },
      MEDIUM: { n: 0, correct: 0 },
      LOW: { n: 0, correct: 0 },
    };
    const highConf: Array<Record<string, unknown>> = [];
    const extreme = { n: 0, wins: 0 };
    const lowSample = { n: 0, correct: 0, avgFavP: 0 };
    const predictions: Array<Record<string, unknown>> = [];

    for (const c of rows) {
      ACTIVE_ELO = eloHistory.ratingsBefore(c.date);
      const p = predictCase(c);
      const pA = p.winner.fighterAWinPct / 100;
      const yA: 0 | 1 = c.winnerId === c.fighterA.id ? 1 : 0;
      const predId =
        p.predictedWinnerSide === "A"
          ? c.fighterA.id
          : p.predictedWinnerSide === "B"
            ? c.fighterB.id
            : p.winner.fighterAWinPct >= p.winner.fighterBWinPct
              ? c.fighterA.id
              : c.fighterB.id;
      const ok = predId === c.winnerId;
      if (ok) correct += 1;
      brier += brierBinary(pA, yA);
      logloss += logLossBinary(pA, yA);
      const favP = Math.max(pA, 1 - pA);
      const favY: 0 | 1 =
        (pA >= 0.5 && yA === 1) || (pA < 0.5 && yA === 0) ? 1 : 0;
      calRows.push({ p: favP, y: favY });
      const bucket = byCoverage[p.coverage.level];
      bucket.n += 1;
      if (ok) bucket.correct += 1;

      if (favP >= 0.8) {
        if (!ok) {
          highConf.push({
            fight: `${c.fighterA.name} vs ${c.fighterB.name}`,
            date: c.date,
            predictedWinner: predId === c.fighterA.id ? c.fighterA.name : c.fighterB.name,
            probability: favP,
            actualWinner: c.winnerId === c.fighterA.id ? c.fighterA.name : c.fighterB.name,
            dataCoverage: p.coverage.level,
            modelAgreement: p.modelAgreement,
            reliability: p.reliability?.overall,
            sampleA: boutsAsOf(c.fighterA, c.date),
            sampleB: boutsAsOf(c.fighterB, c.date),
          });
        }
      }
      if (favP >= 0.9) {
        extreme.n += 1;
        if (ok) extreme.wins += 1;
      }

      const sampleMin = minBoutsAsOf(c);
      if (sampleMin < LOW_SAMPLE_BOUTS) {
        lowSample.n += 1;
        lowSample.avgFavP += favP;
        if (ok) lowSample.correct += 1;
      }

      predictions.push({
        fightId: c.key,
        date: c.date,
        fighterA: c.fighterA.name,
        fighterB: c.fighterB.name,
        actualWinner: c.winnerId === c.fighterA.id ? c.fighterA.name : c.fighterB.name,
        predictedWinner: predId === c.fighterA.id ? c.fighterA.name : c.fighterB.name,
        predictedProbability: favP,
        pA,
        A_KO: p.joint.aKoTko,
        A_SUB: p.joint.aSubmission,
        A_DEC: p.joint.aDecision,
        B_KO: p.joint.bKoTko,
        B_SUB: p.joint.bSubmission,
        B_DEC: p.joint.bDecision,
        drawOther: p.joint.draw,
        dataCoverage: p.coverage.score,
        modelAgreement: p.modelAgreement,
        overallReliability: p.reliability?.overall,
        modelVersion: p.modelVersion,
        correct: ok,
      });
    }
    ACTIVE_ELO = prev;
    const n = rows.length || 1;
    const { ece, buckets } = expectedCalibrationError(calRows);
    return {
      n: rows.length,
      accuracy: correct / n,
      brier: brier / n,
      logloss: logloss / n,
      ece,
      calibrationBuckets: buckets,
      byCoverage: Object.fromEntries(
        Object.entries(byCoverage).map(([k, v]) => [
          k,
          { n: v.n, accuracy: v.n ? v.correct / v.n : null },
        ]),
      ),
      highConfidenceErrors: highConf,
      extremeConfidence: {
        n: extreme.n,
        wins: extreme.wins,
        accuracy: extreme.n ? extreme.wins / extreme.n : null,
      },
      lowSample: {
        n: lowSample.n,
        accuracy: lowSample.n ? lowSample.correct / lowSample.n : null,
        meanConfidence: lowSample.n ? lowSample.avgFavP / lowSample.n : null,
      },
      predictions,
    };
  }

  const winnerTest = evalWithElo(winnerSplit.test);
  const winnerVal = evalWithElo(winnerSplit.validation);

  // Method evaluation with Elo
  function evalMethodsWithElo(rows: MethodCase[]) {
    const prev = ACTIVE_ELO;
    const out = (() => {
      // temporarily wrap predictCase
      return evaluateMethods(
        rows.map((c) => {
          ACTIVE_ELO = eloHistory.ratingsBefore(c.date);
          return c;
        }),
      );
    })();
    // evaluateMethods calls predictCase which uses ACTIVE_ELO — set per fight inside evaluateMethods
    // Re-run properly:
    ACTIVE_ELO = prev;
    return evaluateMethodsElo(rows, eloHistory);
  }

  const methodTest = evalMethodsWithElo(methodSplit.test);
  const methodAll = evalMethodsWithElo(methodCases);

  const baselineForm = baselineAlwaysFavorite(winnerSplit.test);
  const baselineRec = baselineRecord(winnerSplit.test);
  const baselineElo = baselineEloOnly(winnerSplit.test, eloHistory);
  const smoke = smokeTest(catalog);

  // Feature correlation (simple pairwise on delta features from train)
  const corrRows = computeFeatureCorrelations(winnerSplit.train.slice(0, 200));

  // Explicit v3 reference (frozen report) — same snapshot family, prior engine.
  let v3Reference: Record<string, unknown> | null = null;
  if (existsSync(V3_REFERENCE_REPORT)) {
    try {
      const v3 = JSON.parse(readFileSync(V3_REFERENCE_REPORT, "utf8")) as {
        modelVersion?: string;
        winner?: { test?: Record<string, unknown> };
        calibration?: Record<string, unknown>;
      };
      v3Reference = {
        source: V3_REFERENCE_REPORT,
        modelVersion: v3.modelVersion ?? "prediction_engine_v3",
        test: v3.winner?.test ?? null,
        calibration: v3.calibration ?? null,
        note: "Frozen v3 backtest on prior 60/20/20 split (n=81). Compare probabilistic metrics, not raw accuracy alone.",
      };
    } catch {
      v3Reference = null;
    }
  }

  const beatsEloBrier = winnerTest.brier <= baselineElo.brier;
  const beatsEloLogloss = winnerTest.logloss <= baselineElo.logloss;
  const beatsRecBrier = winnerTest.brier <= baselineRec.brier;
  const beatsRecLogloss = winnerTest.logloss <= baselineRec.logloss;
  const beatsEloEce = winnerTest.ece <= baselineElo.ece;
  const beatsRecEce = winnerTest.ece <= baselineRec.ece;
  const complementsBaselines =
    (beatsEloBrier || beatsRecBrier) && (beatsEloLogloss || beatsRecLogloss);
  const promote =
    beatsEloBrier &&
    beatsEloLogloss &&
    beatsRecBrier &&
    beatsRecLogloss &&
    beatsEloEce &&
    beatsRecEce;

  const eceRegressionNote =
    "ECE vs v3: v3 test ECE was ~0.041 with T=1.15 / shrink=0.70 (stronger pull toward 50/50). " +
    "v4 fit prefers lower T (sharper) + weaker shrink + Platt on a small validation set, which " +
    "improves sharpness/logloss sometimes but widens bucket gaps — especially mid-confidence bins — raising ECE. " +
    "Decision-channel de-biasing also redistributes probability mass without retuning calibration targets for ECE.";

  const summary = {
    modelVersion: PREDICTION_MODEL_VERSION,
    featureVersion: PREDICTION_FEATURE_VERSION,
    calibrationVersion: PREDICTION_CALIBRATION_VERSION,
    dataSnapshotVersion: PREDICTION_DATA_SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    dataSource: {
      kind: "local_snapshot_only",
      path: snapshotPath,
      sha256_16: snapshotHash,
      lastUpdated,
      liveEspn: false,
      note: "Backtest never calls ESPN. App catalog may time out on live ESPN (28s) and fall back to this same snapshot.",
    },
    corpus: {
      winnerLabeled: winnerCases.length,
      methodLabeled: methodCases.length,
      winnerSplit: {
        train: winnerSplit.train.length,
        validation: winnerSplit.validation.length,
        test: winnerSplit.test.length,
      },
      methodSplit: {
        train: methodSplit.train.length,
        validation: methodSplit.validation.length,
        test: methodSplit.test.length,
      },
      dateRange: {
        from: winnerCases[0]?.date ?? null,
        to: winnerCases[winnerCases.length - 1]?.date ?? null,
      },
      splitPolicy: "chrono train50 / val15 / test35 (expanded holdout)",
      lowSampleThresholdAsOfBouts: LOW_SAMPLE_BOUTS,
    },
    calibration: { ...calibration, platt },
    baselines: {
      preFightForm3: baselineForm,
      recordWinRateAsOf: baselineRec,
      eloOnly: baselineElo,
    },
    v3Reference,
    comparison: {
      v4: {
        n: winnerTest.n,
        accuracy: winnerTest.accuracy,
        brier: winnerTest.brier,
        logloss: winnerTest.logloss,
        ece: winnerTest.ece,
      },
      eloOnly: {
        n: baselineElo.n,
        accuracy: baselineElo.accuracy,
        brier: baselineElo.brier,
        logloss: baselineElo.logloss,
        ece: baselineElo.ece,
      },
      recordWinRateAsOf: {
        n: baselineRec.n,
        accuracy: baselineRec.accuracy,
        brier: baselineRec.brier,
        logloss: baselineRec.logloss,
        ece: baselineRec.ece,
      },
      v3FrozenTest: v3Reference && typeof v3Reference === "object" && "test" in v3Reference
        ? (v3Reference as { test: unknown }).test
        : null,
    },
    winner: {
      validation: {
        n: winnerVal.n,
        accuracy: winnerVal.accuracy,
        brier: winnerVal.brier,
        logloss: winnerVal.logloss,
        ece: winnerVal.ece,
        calibrationBuckets: winnerVal.calibrationBuckets,
        byCoverage: winnerVal.byCoverage,
        extremeConfidence: winnerVal.extremeConfidence,
        lowSample: winnerVal.lowSample,
      },
      test: {
        n: winnerTest.n,
        accuracy: winnerTest.accuracy,
        brier: winnerTest.brier,
        logloss: winnerTest.logloss,
        ece: winnerTest.ece,
        calibrationBuckets: winnerTest.calibrationBuckets,
        byCoverage: winnerTest.byCoverage,
        extremeConfidence: winnerTest.extremeConfidence,
        lowSample: winnerTest.lowSample,
        highConfidenceErrorCount: winnerTest.highConfidenceErrors.length,
      },
    },
    methods: {
      test: methodTest,
      allDiagnostic: methodAll,
    },
    smokeTest: smoke,
    promotion: {
      candidateBeatsFormBaselineOnAccuracy: winnerTest.accuracy >= baselineForm.accuracy,
      candidateBeatsEloOnBrier: beatsEloBrier,
      candidateBeatsEloOnLogloss: beatsEloLogloss,
      candidateBeatsEloOnEce: beatsEloEce,
      candidateBeatsRecordAsOfOnBrier: beatsRecBrier,
      candidateBeatsRecordAsOfOnLogloss: beatsRecLogloss,
      candidateBeatsRecordAsOfOnEce: beatsRecEce,
      complementsBaselines,
      decisionBiasPp: methodTest.decisionBiasPp,
      promotedToArtifact: promote,
      gate: "Require Brier+logloss+ECE ≤ Elo and ≤ as-of record. Accuracy is informational only.",
    },
    notes: [
      "Winner corpus from matched recentFights pairs (as-of; Elo ratingsBefore; career rates down-weighted).",
      `Method corpus: ${methodCases.length} labeled bouts from local catalog (+ recent join) — no live ESPN.`,
      "Record baseline uses careerRecordAsOf (strict pre-fight); leaky post-fight career totals removed.",
      `Low-sample bucket: min(boutsAsOf) < ${LOW_SAMPLE_BOUTS}.`,
      "No Anthropic calls. Smoke-test cards are diagnostic only — not used in fitting.",
      "Calibration (T/shrink) + Platt fitted on validation only; test untouched during selection.",
      eceRegressionNote,
      `Chronological Elo built from ${winnerCases.length} labeled pairs.`,
      `Snapshot ${snapshotHash} @ ${lastUpdated ?? "unknown"} — reproducible offline.`,
    ],
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "reports", "fightscope", PREDICTION_MODEL_VERSION, stamp);
  mkdirSync(outDir, { recursive: true });
  // Also keep legacy path
  const legacyDir = path.join(process.cwd(), "reports", "backtest", stamp);
  mkdirSync(legacyDir, { recursive: true });

  const writeBoth = (name: string, content: string) => {
    writeFileSync(path.join(outDir, name), content);
    writeFileSync(path.join(legacyDir, name), content);
  };

  writeBoth("summary.json", JSON.stringify(summary, null, 2));
  writeBoth(
    "decision-bias.json",
    JSON.stringify(
      {
        predictedDecisionRate: methodTest.predictedDistribution.decision,
        actualDecisionRate: methodTest.actualDistribution.decision,
        decisionBiasPp: methodTest.decisionBiasPp,
        predictedKo: methodTest.predictedDistribution.koTko,
        actualKo: methodTest.actualDistribution.koTko,
        predictedSub: methodTest.predictedDistribution.submission,
        actualSub: methodTest.actualDistribution.submission,
        byRounds: methodTest.byRounds,
      },
      null,
      2,
    ),
  );
  writeBoth(
    "method-confusion.csv",
    [
      "actual,pred_ko,pred_sub,pred_dec",
      ...(["ko", "sub", "dec"] as const).map(
        (a) =>
          `${a},${methodTest.confusion[a].ko},${methodTest.confusion[a].sub},${methodTest.confusion[a].dec}`,
      ),
    ].join("\n"),
  );
  writeBoth(
    "calibration-by-bucket.csv",
    [
      "lo,hi,n,avgPredicted,avgActual,gap",
      ...winnerTest.calibrationBuckets.map(
        (b) =>
          `${b.lo},${b.hi},${b.n},${b.avgP.toFixed(4)},${b.avgY.toFixed(4)},${(b.avgP - b.avgY).toFixed(4)}`,
      ),
    ].join("\n"),
  );
  writeBoth(
    "high-confidence-errors.csv",
    [
      "fight,date,predictedWinner,probability,actualWinner,dataCoverage,modelAgreement,reliability,sampleA,sampleB",
      ...winnerTest.highConfidenceErrors.map((r) =>
        [
          JSON.stringify(r.fight),
          r.date,
          JSON.stringify(r.predictedWinner),
          r.probability,
          JSON.stringify(r.actualWinner),
          r.dataCoverage,
          r.modelAgreement,
          r.reliability,
          r.sampleA,
          r.sampleB,
        ].join(","),
      ),
    ].join("\n"),
  );
  writeBoth(
    "predictions.csv",
    [
      "fightId,date,fighterA,fighterB,actualWinner,predictedWinner,predictedProbability,pA,A_KO,A_SUB,A_DEC,B_KO,B_SUB,B_DEC,drawOther,dataCoverage,modelAgreement,overallReliability,correct",
      ...winnerTest.predictions.map((r) =>
        [
          r.fightId,
          r.date,
          JSON.stringify(r.fighterA),
          JSON.stringify(r.fighterB),
          JSON.stringify(r.actualWinner),
          JSON.stringify(r.predictedWinner),
          r.predictedProbability,
          r.pA,
          r.A_KO,
          r.A_SUB,
          r.A_DEC,
          r.B_KO,
          r.B_SUB,
          r.B_DEC,
          r.drawOther,
          r.dataCoverage,
          r.modelAgreement,
          r.overallReliability,
          r.correct,
        ].join(","),
      ),
    ].join("\n"),
  );
  writeBoth(
    "coverage-analysis.csv",
    [
      "coverage,n,accuracy",
      ...Object.entries(winnerTest.byCoverage).map(
        ([k, v]) => `${k},${(v as { n: number; accuracy: number | null }).n},${(v as { n: number; accuracy: number | null }).accuracy}`,
      ),
    ].join("\n"),
  );
  writeBoth(
    "low-sample-analysis.csv",
    [
      "bucket,n,accuracy,meanConfidence",
      `asOf_lt${LOW_SAMPLE_BOUTS}_pro_fights,${winnerTest.lowSample.n},${winnerTest.lowSample.accuracy},${winnerTest.lowSample.meanConfidence}`,
    ].join("\n"),
  );
  writeBoth(
    "baseline-comparison.csv",
    [
      "model,n,accuracy,brier,logloss,ece",
      `fightscope_v4,${winnerTest.n},${winnerTest.accuracy},${winnerTest.brier},${winnerTest.logloss},${winnerTest.ece}`,
      `eloOnly,${baselineElo.n},${baselineElo.accuracy},${baselineElo.brier},${baselineElo.logloss},${baselineElo.ece}`,
      `recordWinRateAsOf,${baselineRec.n},${baselineRec.accuracy},${baselineRec.brier},${baselineRec.logloss},${baselineRec.ece}`,
      `preFightForm3,${baselineForm.n},${baselineForm.accuracy},,,`,
      ...(v3Reference &&
      typeof v3Reference === "object" &&
      v3Reference !== null &&
      "test" in v3Reference &&
      v3Reference.test &&
      typeof v3Reference.test === "object"
        ? [
            (() => {
              const t = v3Reference.test as {
                n?: number;
                accuracy?: number;
                brier?: number;
                logloss?: number;
                ece?: number;
              };
              return `fightscope_v3_frozen,${t.n ?? ""},${t.accuracy ?? ""},${t.brier ?? ""},${t.logloss ?? ""},${t.ece ?? ""}`;
            })(),
          ]
        : []),
    ].join("\n"),
  );
  writeBoth(
    "feature-correlations.csv",
    ["featureA,featureB,correlation,sampleSize", ...corrRows.map((r) => `${r.a},${r.b},${r.corr.toFixed(4)},${r.n}`)].join(
      "\n",
    ),
  );
  writeBoth("comparison.json", JSON.stringify(summary.comparison, null, 2));
  writeBoth("promotion.json", JSON.stringify(summary.promotion, null, 2));

  const artifactPayload = {
    ...defaultArtifactMeta(),
    trainedAt: new Date().toISOString(),
    calibration,
    platt,
    baseRates: getLiveBaseRates(),
    metrics: {
      validation: { accuracy: winnerVal.accuracy, brier: winnerVal.brier, logloss: winnerVal.logloss, ece: winnerVal.ece },
      test: { accuracy: winnerTest.accuracy, brier: winnerTest.brier, logloss: winnerTest.logloss, ece: winnerTest.ece },
      decisionBiasPp: methodTest.decisionBiasPp,
      promotion: summary.promotion,
    },
    notes: summary.notes as string[],
  };

  let artifactPath: string;
  if (promote) {
    artifactPath = saveModelArtifact(artifactPayload);
  } else {
    // Do NOT overwrite production.json — write candidate only.
    const candDir = path.join(process.cwd(), "src/server/prediction/artifacts");
    mkdirSync(candDir, { recursive: true });
    artifactPath = path.join(
      candDir,
      `candidate-${PREDICTION_MODEL_VERSION}-${stamp}.json`,
    );
    writeFileSync(artifactPath, JSON.stringify(artifactPayload, null, 2));
    writeFileSync(
      path.join(candDir, "candidate-latest.json"),
      JSON.stringify(artifactPayload, null, 2),
    );
  }

  console.log(`\n=== FightScope ${PREDICTION_MODEL_VERSION} backtest (snapshot ${snapshotHash}) ===\n`);
  console.log(
    `Winner test n=${winnerTest.n}  acc=${(winnerTest.accuracy * 100).toFixed(1)}%  Brier=${winnerTest.brier.toFixed(3)}  logloss=${winnerTest.logloss.toFixed(3)}  ECE=${winnerTest.ece.toFixed(3)}`,
  );
  console.log(
    `Baselines — form3 ${(baselineForm.accuracy * 100).toFixed(1)}% | recordAsOf ${(baselineRec.accuracy * 100).toFixed(1)}% Brier ${baselineRec.brier.toFixed(3)} | Elo ${(baselineElo.accuracy * 100).toFixed(1)}% Brier ${baselineElo.brier.toFixed(3)}`,
  );
  if (v3Reference && typeof v3Reference === "object" && v3Reference !== null && "test" in v3Reference) {
    const t = v3Reference.test as {
      accuracy?: number;
      brier?: number;
      logloss?: number;
      ece?: number;
      n?: number;
    } | null;
    if (t) {
      console.log(
        `v3 frozen  n=${t.n}  acc=${((t.accuracy ?? 0) * 100).toFixed(1)}%  Brier=${(t.brier ?? 0).toFixed(3)}  logloss=${(t.logloss ?? 0).toFixed(3)}  ECE=${(t.ece ?? 0).toFixed(3)}`,
      );
    }
  }
  console.log(
    `Method test n=${methodTest.n}  exact=${(methodTest.exactMethodAccuracy * 100).toFixed(1)}%  finishVsDec=${(methodTest.finishVsDecisionAccuracy * 100).toFixed(1)}%`,
  );
  console.log(
    `Decision bias: pred ${(methodTest.predictedDistribution.decision * 100).toFixed(1)}% vs act ${(methodTest.actualDistribution.decision * 100).toFixed(1)}%  (Δ ${methodTest.decisionBiasPp.toFixed(1)} pp)`,
  );
  console.log(
    `High-conf errors (≥80% wrong): ${winnerTest.highConfidenceErrors.length} | Extreme (≥90%): n=${winnerTest.extremeConfidence.n} acc=${winnerTest.extremeConfidence.accuracy}`,
  );
  console.log(
    `Low-sample (as-of <${LOW_SAMPLE_BOUTS} bouts): n=${winnerTest.lowSample.n} acc=${winnerTest.lowSample.accuracy} meanConf=${winnerTest.lowSample.meanConfidence}`,
  );
  console.log(`Calibration: T=${calibration.temperature} shrink=${calibration.shrinkStrength} Platt a=${platt.a} b=${platt.b}`);
  console.log(`Promotion: ${promote ? "YES → production.json" : "NO — candidate only (gates failed)"}`);
  console.log(`Artifact: ${artifactPath}`);
  console.log(`Wrote ${outDir}`);

  return summary;
}

function evaluateMethodsElo(
  rows: MethodCase[],
  eloHistory: ReturnType<typeof buildEloHistory>,
) {
  const prev = ACTIVE_ELO;
  // Patch: evaluateMethods uses predictCase which reads ACTIVE_ELO —
  // we need per-row Elo. Inline a copy of evaluateMethods with Elo:
  const predDist = { ko: 0, sub: 0, dec: 0 };
  const actDist = { ko: 0, sub: 0, dec: 0 };
  let exact = 0;
  let finishVsDec = 0;
  const confusion = {
    ko: { ko: 0, sub: 0, dec: 0 },
    sub: { ko: 0, sub: 0, dec: 0 },
    dec: { ko: 0, sub: 0, dec: 0 },
  };
  let decPred = 0;
  let decAct = 0;
  let decTp = 0;
  let decFp = 0;
  const byRounds = { r3: { n: 0, exact: 0 }, r5: { n: 0, exact: 0 } };

  for (const c of rows) {
    ACTIVE_ELO = eloHistory.ratingsBefore(c.date);
    const p = predictCase(
      c,
      c.method === "ko" ? "KO/TKO" : c.method === "sub" ? "Submission" : "Decision",
    );
    const methods = p.methods;
    predDist.ko += methods.koTko;
    predDist.sub += methods.submission;
    predDist.dec += methods.decision;
    actDist[c.method] += 1;
    const predMethod =
      methods.koTko >= methods.submission && methods.koTko >= methods.decision
        ? "ko"
        : methods.submission >= methods.decision
          ? "sub"
          : "dec";
    confusion[c.method][predMethod] += 1;
    if (predMethod === c.method) exact += 1;
    if ((c.method !== "dec") === (predMethod !== "dec")) finishVsDec += 1;
    if (predMethod === "dec") decPred += 1;
    if (c.method === "dec") decAct += 1;
    if (predMethod === "dec" && c.method === "dec") decTp += 1;
    if (predMethod === "dec" && c.method !== "dec") decFp += 1;
    const rk = c.rounds === 5 ? byRounds.r5 : byRounds.r3;
    rk.n += 1;
    if (predMethod === c.method) rk.exact += 1;
  }
  ACTIVE_ELO = prev;
  const n = rows.length || 1;
  const predAvg = {
    koTko: predDist.ko / n / 100,
    submission: predDist.sub / n / 100,
    decision: predDist.dec / n / 100,
  };
  const actAvg = {
    koTko: actDist.ko / n,
    submission: actDist.sub / n,
    decision: actDist.dec / n,
  };
  return {
    n: rows.length,
    exactMethodAccuracy: exact / n,
    finishVsDecisionAccuracy: finishVsDec / n,
    predictedDistribution: predAvg,
    actualDistribution: actAvg,
    decisionBiasPp: (predAvg.decision - actAvg.decision) * 100,
    decisionPrecision: decPred ? decTp / decPred : null,
    decisionRecall: decAct ? decTp / decAct : null,
    decisionFalsePositiveRate: n - decAct ? decFp / (n - decAct) : null,
    confusion,
    byRounds: {
      rounds3: {
        n: byRounds.r3.n,
        exactMethodAccuracy: byRounds.r3.n ? byRounds.r3.exact / byRounds.r3.n : null,
      },
      rounds5: {
        n: byRounds.r5.n,
        exactMethodAccuracy: byRounds.r5.n ? byRounds.r5.exact / byRounds.r5.n : null,
      },
    },
  };
}

function computeFeatureCorrelations(rows: WinnerCase[]) {
  // Simple correlations between feature deltas on a sample
  const deltas = rows.map((c) => {
    const asOfMs = Date.parse(c.date);
    const form = (f: Fighter) => {
      const recent = (f.recentFights ?? []).filter((rf) => Date.parse(rf.date) < asOfMs);
      const slice = recent.slice(0, 3);
      if (!slice.length) return 0.5;
      return slice.filter((r) => r.result === "W").length / slice.length;
    };
    const wr = (f: Fighter) => {
      const r = careerRecordAsOf(f, c.date);
      const d = Math.max(1, r.wins + r.losses);
      return r.wins / d;
    };
    return {
      form3: form(c.fighterA) - form(c.fighterB),
      winRate: wr(c.fighterA) - wr(c.fighterB),
      experience:
        Math.log1p(boutsAsOf(c.fighterA, c.date)) - Math.log1p(boutsAsOf(c.fighterB, c.date)),
      slpm:
        (c.fighterA.statistics.sigStrikesLandedPerMin ?? 3.5) -
        (c.fighterB.statistics.sigStrikesLandedPerMin ?? 3.5),
    };
  });
  const keys = ["form3", "winRate", "experience", "slpm"] as const;
  const out: Array<{ a: string; b: string; corr: number; n: number }> = [];
  const corr = (xs: number[], ys: number[]) => {
    const n = xs.length;
    const mx = xs.reduce((s, v) => s + v, 0) / n;
    const my = ys.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < n; i += 1) {
      const a = xs[i]! - mx;
      const b = ys[i]! - my;
      num += a * b;
      dx += a * a;
      dy += b * b;
    }
    return num / (Math.sqrt(dx * dy) || 1);
  };
  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      const a = keys[i]!;
      const b = keys[j]!;
      const r = corr(
        deltas.map((d) => d[a]),
        deltas.map((d) => d[b]),
      );
      out.push({ a, b, corr: r, n: deltas.length });
    }
  }
  return out.sort((x, y) => Math.abs(y.corr) - Math.abs(x.corr));
}

if (require.main === module) {
  void runBacktest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
