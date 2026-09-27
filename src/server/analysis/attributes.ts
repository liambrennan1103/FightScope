import type { Fighter, FinishRecord, RecentFight, RecordLine } from "@/lib/types";
import { clampScore, type FighterStatSplits } from "@/server/analysis/stat-types";

function winRate(record: RecordLine): number {
  const decided = record.wins + record.losses;
  if (decided <= 0) return 0.5;
  return record.wins / decided;
}

function recentRate(fights: RecentFight[], n: number): number | null {
  const slice = fights.slice(0, n);
  if (slice.length === 0) return null;
  const wins = slice.filter((fight) => fight.result === "W").length;
  return wins / slice.length;
}

function finishShare(record: RecordLine, finishes: FinishRecord): {
  koRate: number;
  subRate: number;
  finishRate: number;
} {
  const wins = Math.max(1, record.wins);
  const ko = finishes.koTko ?? 0;
  const sub = finishes.submissions ?? 0;
  return {
    koRate: ko / wins,
    subRate: sub / wins,
    finishRate: (ko + sub) / wins,
  };
}

/**
 * Deterministic FightScope attribute scores (0–100) from real bio/stats/form.
 * Missing rate stats reduce confidence in that component but never invent SLpM-like values.
 */
export function deriveAttributes(input: {
  record: RecordLine;
  finishes: FinishRecord;
  recentFights: RecentFight[];
  age: number | null;
  ranking: Fighter["ranking"];
  statistics: Fighter["statistics"];
  splits?: FighterStatSplits | null;
}): Record<string, number> {
  const { record, finishes, recentFights, age, ranking, statistics, splits } = input;
  const wr = winRate(record);
  const finishesShare = finishShare(record, finishes);
  const form3 = recentRate(recentFights, 3);
  const form5 = recentRate(recentFights, 5);
  const decided = record.wins + record.losses;

  const slpm = statistics.sigStrikesLandedPerMin;
  const acc = statistics.sigStrikeAccuracy;
  const sapm = statistics.sigStrikesAbsorbedPerMin;
  const sdef = statistics.strikingDefense;
  const td15 = statistics.takedownsPer15;
  const tdAcc = statistics.takedownAccuracy;
  const tdDef = statistics.takedownDefense;
  const sub15 = statistics.submissionAttemptsPer15;
  const kd15 = statistics.knockdownsPer15;

  // Striking: volume + accuracy (+ defense when known)
  let striking = 52 + wr * 10;
  if (slpm != null) striking += Math.min(18, slpm * 3.2);
  if (acc != null) striking += (acc - 40) * 0.22;
  if (sdef != null) striking += (sdef - 50) * 0.12;

  // Power: knockdown rate + KO share
  let power = 50 + finishesShare.koRate * 28;
  if (kd15 != null) power += Math.min(16, kd15 * 10);

  // Wrestling: TD rates + defense
  let wrestling = 50 + wr * 6;
  if (td15 != null) wrestling += Math.min(20, td15 * 5.5);
  if (tdAcc != null) wrestling += (tdAcc - 35) * 0.18;
  if (tdDef != null) wrestling += (tdDef - 55) * 0.16;
  if (splits && splits.advances > 0) wrestling += Math.min(6, splits.advances * 0.15);

  // Grappling: submissions + advances/reversals
  let grappling = 50 + finishesShare.subRate * 26;
  if (sub15 != null) grappling += Math.min(16, sub15 * 8);
  if (splits) {
    grappling += Math.min(8, splits.reversals * 0.8);
    grappling += Math.min(6, splits.advances * 0.12);
  }

  // Cardio: fight minutes density / five-round experience / youth
  let cardio = 55 + wr * 8;
  if (splits?.fiveRoundFightCount) cardio += Math.min(12, splits.fiveRoundFightCount * 2.2);
  if (age != null) {
    if (age <= 28) cardio += 4;
    else if (age >= 36) cardio -= Math.min(10, (age - 35) * 1.5);
  }
  if (form5 != null) cardio += (form5 - 0.5) * 10;

  // Defense: striking defense + absorption (lower SapM better) + TD defense
  let defense = 52 + wr * 6;
  if (sdef != null) defense += (sdef - 50) * 0.35;
  if (sapm != null) defense += Math.max(-12, Math.min(12, (3.5 - sapm) * 4));
  if (tdDef != null) defense += (tdDef - 55) * 0.15;

  // Durability: inverse KO losses + age + absorption
  const koLosses = finishes.koTkoLosses ?? 0;
  const subLosses = finishes.submissionLosses ?? 0;
  let durability = 70 - koLosses * 7 - subLosses * 3;
  if (sapm != null) durability += Math.max(-10, Math.min(8, (4 - sapm) * 3));
  if (age != null && age >= 37) durability -= Math.min(8, age - 36);

  // Experience: fights + title + ranking
  let experience = 45 + Math.min(30, decided * 1.1);
  if (splits?.titleFightCount) experience += Math.min(12, splits.titleFightCount * 3);
  if (splits?.ufcFightCount) experience += Math.min(10, splits.ufcFightCount * 0.35);
  if (ranking === "C") experience += 10;
  else if (typeof ranking === "number") experience += Math.max(0, 9 - ranking * 0.7);

  // Recent form
  let recentForm = 50;
  if (form3 != null) recentForm = 40 + form3 * 50;
  else if (form5 != null) recentForm = 42 + form5 * 45;
  else recentForm = 48 + wr * 20;
  if (splits?.daysSinceLastFight != null && splits.daysSinceLastFight > 540) {
    recentForm -= Math.min(12, (splits.daysSinceLastFight - 540) / 60);
  }

  return {
    striking: clampScore(striking),
    power: clampScore(power),
    wrestling: clampScore(wrestling),
    grappling: clampScore(grappling),
    cardio: clampScore(cardio),
    defense: clampScore(defense),
    durability: clampScore(durability),
    experience: clampScore(experience),
    recentForm: clampScore(recentForm),
  };
}

export function fightscopeScoreFromAttributes(attributes: Record<string, number>): number {
  const keys = [
    "striking",
    "power",
    "wrestling",
    "grappling",
    "cardio",
    "defense",
    "durability",
    "experience",
    "recentForm",
  ];
  const sum = keys.reduce((total, key) => total + (attributes[key] ?? 50), 0);
  return Math.round(sum / keys.length);
}
