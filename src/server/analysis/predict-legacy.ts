import { ATTRIBUTE_KEYS } from "@/data/constants";
import type { Fighter } from "@/lib/types";
import type { MatchupContext } from "@/server/analysis/stat-types";

/** Legacy scoreMatchup kept for simulation helpers / self-tests. Prefer prediction_engine_v3. */

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function attributeVector(fighter: Fighter): number {
  return ATTRIBUTE_KEYS.reduce((sum, item) => {
    const weight =
      item.key === "recentForm"
        ? 1.15
        : item.key === "cardio"
          ? 1.05
          : item.key === "experience"
            ? 0.9
            : 1;
    return sum + (fighter.attributes[item.key] ?? 50) * weight;
  }, 0);
}

function physicalEdge(a: Fighter, b: Fighter): number {
  let edge = 0;
  if (a.reachCm != null && b.reachCm != null) edge += (a.reachCm - b.reachCm) * 0.18;
  if (a.heightCm != null && b.heightCm != null) edge += (a.heightCm - b.heightCm) * 0.08;
  if (a.age != null && b.age != null) edge += (b.age - a.age) * 0.35;
  return edge;
}

function rankEdge(fighter: Fighter): number {
  if (fighter.ranking === "C") return 10;
  if (typeof fighter.ranking === "number") return Math.max(0, 9 - fighter.ranking * 0.65);
  return 0;
}

function styleTags(fighter: Fighter): string[] {
  const tags: string[] = [];
  const striking = fighter.attributes.striking ?? 50;
  const wrestling = fighter.attributes.wrestling ?? 50;
  const grappling = fighter.attributes.grappling ?? 50;
  const power = fighter.attributes.power ?? 50;
  if (wrestling >= striking + 6) tags.push("wrestler");
  else if (striking >= wrestling + 6) tags.push("striker");
  else tags.push("balanced");
  if (grappling >= 72) tags.push("submission threat");
  if (power >= 74) tags.push("power puncher");
  if (fighter.stance) tags.push(fighter.stance.toLowerCase());
  return tags;
}

export function scoreMatchup(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContext,
): {
  scoreA: number;
  scoreB: number;
  baseAWinPct: number;
} {
  let scoreA = attributeVector(fighterA) + rankEdge(fighterA) * 5 + physicalEdge(fighterA, fighterB);
  let scoreB = attributeVector(fighterB) + rankEdge(fighterB) * 5 + physicalEdge(fighterB, fighterA);

  if (fighterA.stance && fighterB.stance && fighterA.stance !== fighterB.stance) {
    if (fighterA.stance === "Southpaw" && (fighterA.attributes.striking ?? 0) >= 65) scoreA += 3;
    if (fighterB.stance === "Southpaw" && (fighterB.attributes.striking ?? 0) >= 65) scoreB += 3;
  }
  const tagsA = styleTags(fighterA);
  const tagsB = styleTags(fighterB);
  if (tagsA.includes("wrestler") && tagsB.includes("striker")) scoreA += 2.5;
  if (tagsB.includes("wrestler") && tagsA.includes("striker")) scoreB += 2.5;

  if (context.rounds === 5) {
    scoreA += ((fighterA.attributes.cardio ?? 50) - 50) * 0.35;
    scoreB += ((fighterB.attributes.cardio ?? 50) - 50) * 0.35;
  }
  if (context.isTitle) {
    scoreA += ((fighterA.attributes.experience ?? 50) - 50) * 0.25;
    scoreB += ((fighterB.attributes.experience ?? 50) - 50) * 0.25;
  }

  const total = scoreA + scoreB || 1;
  return {
    scoreA,
    scoreB,
    baseAWinPct: (scoreA / total) * 100,
  };
}

export function stableNoise(fighterAId: string, fighterBId: string): number {
  const hash = hashString(`${fighterAId}:${fighterBId}:fs-v1`);
  return ((hash % 11) - 5) * 0.35;
}
