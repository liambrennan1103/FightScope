import type { Fighter } from "@/lib/types";

export type AnalysisDataQuality = "HIGH" | "MEDIUM" | "LOW";

function hasRate(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Explicit data-quality label from input completeness.
 * Never invents missing ESPN rate stats — absence lowers quality.
 */
export function assessDataQuality(fighterA: Fighter, fighterB: Fighter): AnalysisDataQuality {
  const score = (fighter: Fighter): number => {
    let points = 0;
    let max = 0;

    const add = (ok: boolean, weight = 1) => {
      max += weight;
      if (ok) points += weight;
    };

    add(hasRate(fighter.statistics.sigStrikesLandedPerMin), 2);
    add(hasRate(fighter.statistics.sigStrikeAccuracy), 2);
    add(hasRate(fighter.statistics.sigStrikesAbsorbedPerMin), 1);
    add(hasRate(fighter.statistics.strikingDefense), 1);
    add(hasRate(fighter.statistics.takedownsPer15), 2);
    add(hasRate(fighter.statistics.takedownAccuracy), 1);
    add(hasRate(fighter.statistics.takedownDefense), 1);
    add(hasRate(fighter.statistics.knockdownsPer15), 1);
    add(fighter.age != null, 1);
    add(fighter.reachCm != null, 1);
    add(fighter.stance != null, 1);
    add(fighter.record.wins + fighter.record.losses > 0, 1);
    add(fighter.recentFights.length >= 3, 1);

    return max === 0 ? 0 : points / max;
  };

  const avg = (score(fighterA) + score(fighterB)) / 2;
  if (avg >= 0.72) return "HIGH";
  if (avg >= 0.4) return "MEDIUM";
  return "LOW";
}

export function qualityNote(quality: AnalysisDataQuality): string {
  if (quality === "HIGH") {
    return "Input completeness is high (career rates + physicals + recent form).";
  }
  if (quality === "MEDIUM") {
    return "Input completeness is medium — some ESPN rate stats are missing; those fields stay null.";
  }
  return "Input completeness is low — ESPN fight-stat tables unavailable for one or both fighters; attributes lean on record/physicals/form only.";
}
