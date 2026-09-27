import type { Fighter } from "@/lib/types";
import { formFromRecent } from "@/server/prediction/as-of";
import type { MatchupContextV3 } from "@/server/prediction/types";

export type FighterFeatures = {
  winRate: number;
  experienceBouts: number;
  form3: number;
  form5: number;
  koWinRate: number;
  subWinRate: number;
  decisionWinShare: number;
  koLossRate: number;
  subLossRate: number;
  beenFinishedRate: number;
  finishRate: number;
  slpm: number | null;
  sapm: number | null;
  strAcc: number | null;
  strDef: number | null;
  kdPer15: number | null;
  tdPer15: number | null;
  tdAcc: number | null;
  tdDef: number | null;
  subPer15: number | null;
  age: number | null;
  reachCm: number | null;
  heightCm: number | null;
  stanceSouthpaw: number;
  rankScore: number;
  inactivityDays: number | null;
  fiveRoundExp: number;
  titleExp: number;
  /** 0–1 completeness of core fields for this fighter. */
  completeness: number;
};

function safeDiv(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

function rankScore(fighter: Fighter): number {
  if (fighter.ranking === "C") return 1;
  if (typeof fighter.ranking === "number") return Math.max(0, 1 - fighter.ranking / 15);
  return 0.35;
}

export function extractFighterFeatures(
  fighter: Fighter,
  context: MatchupContextV3,
): FighterFeatures {
  const wins = fighter.record.wins;
  const losses = fighter.record.losses;
  const draws = fighter.record.draws;
  const bouts = wins + losses + draws;
  const winRate = safeDiv(wins, Math.max(1, wins + losses));

  const koW = fighter.finishes.koTko ?? 0;
  const subW = fighter.finishes.submissions ?? 0;
  const koL = fighter.finishes.koTkoLosses ?? 0;
  const subL = fighter.finishes.submissionLosses ?? 0;
  const finishWins = koW + subW;
  const decisionWins = Math.max(0, wins - finishWins);

  const form3 = formFromRecent(fighter.recentFights, 3, {
    decayLambda: 0.85,
    nowMs: context.asOf ? Date.parse(context.asOf) : Date.now(),
  }).winRate;
  const form5 = formFromRecent(fighter.recentFights, 5, {
    decayLambda: 0.55,
    nowMs: context.asOf ? Date.parse(context.asOf) : Date.now(),
  }).winRate;

  const stats = fighter.statistics;
  const splits = fighter.statSplits;

  const fieldsPresent = [
    fighter.age != null,
    fighter.reachCm != null,
    fighter.heightCm != null,
    fighter.stance != null,
    bouts >= 3,
    fighter.recentFights.length >= 3,
    stats.sigStrikesLandedPerMin != null,
    stats.sigStrikesAbsorbedPerMin != null,
    stats.strikingDefense != null,
    stats.takedownsPer15 != null,
    fighter.finishes.koTko != null,
    fighter.finishes.submissions != null,
  ];
  const completeness = fieldsPresent.filter(Boolean).length / fieldsPresent.length;

  // When as-of mode: career rate stats may leak — caller should shrink via coverage.
  void context;

  return {
    winRate,
    experienceBouts: bouts,
    form3,
    form5,
    koWinRate: safeDiv(koW, Math.max(1, wins)),
    subWinRate: safeDiv(subW, Math.max(1, wins)),
    decisionWinShare: safeDiv(decisionWins, Math.max(1, wins)),
    koLossRate: safeDiv(koL, Math.max(1, losses)),
    subLossRate: safeDiv(subL, Math.max(1, losses)),
    beenFinishedRate: safeDiv(koL + subL, Math.max(1, losses)),
    finishRate: safeDiv(finishWins, Math.max(1, wins)),
    slpm: stats.sigStrikesLandedPerMin,
    sapm: stats.sigStrikesAbsorbedPerMin,
    strAcc: stats.sigStrikeAccuracy,
    strDef: stats.strikingDefense,
    kdPer15: stats.knockdownsPer15,
    tdPer15: stats.takedownsPer15,
    tdAcc: stats.takedownAccuracy,
    tdDef: stats.takedownDefense,
    subPer15: stats.submissionAttemptsPer15,
    age: fighter.age,
    reachCm: fighter.reachCm,
    heightCm: fighter.heightCm,
    stanceSouthpaw: fighter.stance === "Southpaw" ? 1 : 0,
    rankScore: rankScore(fighter),
    inactivityDays: splits?.daysSinceLastFight ?? null,
    fiveRoundExp: splits?.fiveRoundFightCount ?? 0,
    titleExp: splits?.titleFightCount ?? 0,
    completeness,
  };
}

export type MatchupFeatures = {
  a: FighterFeatures;
  b: FighterFeatures;
  rounds: 3 | 5;
  isTitle: boolean;
  isWomens: boolean;
  asOf: boolean;
  /** Mean completeness 0–1. */
  coverageScore: number;
  /** Symmetric interaction features (A offense vs B defense, etc.). */
  interactions: MatchupInteractions;
};

export type MatchupInteractions = {
  /** A SLpM vs B strike defense (higher = A striking edge). */
  aStrikeVsBDef: number;
  bStrikeVsADef: number;
  /** A KD rate × B KO vulnerability. */
  aKoThreatVsB: number;
  bKoThreatVsA: number;
  /** A TD rate vs B TD defense. */
  aTdVsBDef: number;
  bTdVsADef: number;
  /** A sub threat vs B sub vulnerability. */
  aSubVsB: number;
  bSubVsA: number;
};

function nz(value: number | null | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

export function buildMatchupFeatures(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContextV3,
): MatchupFeatures {
  const a = extractFighterFeatures(fighterA, context);
  const b = extractFighterFeatures(fighterB, context);
  const division = (context.division ?? "").toLowerCase();
  const isWomens = division.includes("women") || division.startsWith("w ");

  const interactions: MatchupInteractions = {
    aStrikeVsBDef:
      (nz(a.slpm, 3.5) / 5) * (1 - nz(b.strDef, 50) / 100) -
      (nz(b.slpm, 3.5) / 5) * (1 - nz(a.strDef, 50) / 100),
    bStrikeVsADef:
      (nz(b.slpm, 3.5) / 5) * (1 - nz(a.strDef, 50) / 100) -
      (nz(a.slpm, 3.5) / 5) * (1 - nz(b.strDef, 50) / 100),
    aKoThreatVsB:
      (a.koWinRate + nz(a.kdPer15, 0) / 2) * (0.4 + 0.6 * (b.koLossRate + nz(b.sapm, 3.5) / 8)),
    bKoThreatVsA:
      (b.koWinRate + nz(b.kdPer15, 0) / 2) * (0.4 + 0.6 * (a.koLossRate + nz(a.sapm, 3.5) / 8)),
    aTdVsBDef: (nz(a.tdPer15, 1) / 3) * (1 - nz(b.tdDef, 60) / 100),
    bTdVsADef: (nz(b.tdPer15, 1) / 3) * (1 - nz(a.tdDef, 60) / 100),
    aSubVsB: (a.subWinRate + nz(a.subPer15, 0) / 2) * (0.4 + 0.6 * b.subLossRate),
    bSubVsA: (b.subWinRate + nz(b.subPer15, 0) / 2) * (0.4 + 0.6 * a.subLossRate),
  };

  return {
    a,
    b,
    rounds: context.rounds,
    isTitle: context.isTitle,
    isWomens,
    asOf: Boolean(context.asOf),
    coverageScore: (a.completeness + b.completeness) / 2,
    interactions,
  };
}
