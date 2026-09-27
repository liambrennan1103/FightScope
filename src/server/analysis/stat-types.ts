import type { FightResult, FighterStatistics, Stance } from "@/lib/types";

/** Per-bout log used to aggregate career rates and opponent-facing defense. */
export interface FightStatLog {
  competitionId: string;
  eventId: string | null;
  date: string;
  opponentId: string | null;
  opponentName: string | null;
  result: FightResult | null;
  method: string | null;
  round: number | null;
  time: string | null;
  minutes: number | null;
  sigStrikesLanded: number;
  sigStrikesAttempted: number;
  knockdowns: number;
  takedownsLanded: number;
  takedownsAttempted: number;
  submissions: number;
  reversals: number;
  advances: number;
  headPct: number | null;
  bodyPct: number | null;
  legPct: number | null;
  distanceSigLanded: number;
  clinchSigLanded: number;
  groundSigLanded: number;
  titleFight: boolean;
}

export interface FighterStatBundle {
  fighterId: string;
  logs: FightStatLog[];
  statistics: FighterStatistics;
  splits: FighterStatSplits;
  derivedCareer: DerivedCareerFacts;
}

export interface FighterStatSplits {
  headPct: number | null;
  bodyPct: number | null;
  legPct: number | null;
  distanceSigLanded: number;
  clinchSigLanded: number;
  groundSigLanded: number;
  reversals: number;
  advances: number;
  ufcFightCount: number | null;
  fiveRoundFightCount: number | null;
  daysSinceLastFight: number | null;
  titleFightCount: number | null;
}

export interface DerivedCareerFacts {
  finishRate: number | null;
  koWinRate: number | null;
  subWinRate: number | null;
  recentWinRate3: number | null;
  recentWinRate5: number | null;
}

export interface MatchupContext {
  rounds: 3 | 5;
  isTitle: boolean;
  division: string | null;
}

export const EMPTY_STATISTICS: FighterStatistics = {
  sigStrikesLandedPerMin: null,
  sigStrikeAccuracy: null,
  sigStrikesAbsorbedPerMin: null,
  strikingDefense: null,
  takedownsPer15: null,
  takedownAccuracy: null,
  takedownDefense: null,
  submissionAttemptsPer15: null,
  knockdownsPer15: null,
};

export const EMPTY_SPLITS: FighterStatSplits = {
  headPct: null,
  bodyPct: null,
  legPct: null,
  distanceSigLanded: 0,
  clinchSigLanded: 0,
  groundSigLanded: 0,
  reversals: 0,
  advances: 0,
  ufcFightCount: null,
  fiveRoundFightCount: null,
  daysSinceLastFight: null,
  titleFightCount: null,
};

export function parseClockToMinutes(period: number | null, displayClock: string | null): number | null {
  if (period == null || period <= 0) return null;
  if (!displayClock || displayClock === "-") {
    // Unknown clock — count completed prior rounds only.
    return Math.max(0, period - 1) * 5;
  }
  const match = displayClock.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return Math.max(0, period - 1) * 5;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  // ESPN MMA history uses displayClock as elapsed time in the current round at stoppage/final.
  const elapsedInRound = Math.min(5, Math.max(0, minutes + seconds / 60));
  return Math.max(0, period - 1) * 5 + elapsedInRound;
}

export function parsePair(value: string | null | undefined): { landed: number; attempted: number } {
  if (!value) return { landed: 0, attempted: 0 };
  const match = String(value).trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return { landed: 0, attempted: 0 };
  return { landed: Number(match[1]), attempted: Number(match[2]) };
}

export function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const cleaned = value.replace(/%/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function parsePercent(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/%/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function ratePer15(total: number, minutes: number): number | null {
  if (minutes <= 0) return null;
  return round1((total * 15) / minutes);
}

export function ratePerMin(total: number, minutes: number): number | null {
  if (minutes <= 0) return null;
  return round2(total / minutes);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function clampScore(value: number, min = 35, max = 95): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

export function stanceTag(stance: Stance | null): string | null {
  return stance;
}
