import type { Fighter } from "@/lib/types";
import { scoreMatchup, stableNoise } from "@/server/analysis/predict";
import type { MatchupContext } from "@/server/analysis/stat-types";

/**
 * Lightweight deterministic "simulation": sample around the scored logit with a fixed seed
 * derived from fighter ids — not random at runtime, reproducible, probability-like spread.
 */
export function simulateWinProbabilities(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContext,
  samples = 401,
): { fighterAWinPct: number; fighterBWinPct: number } {
  const { baseAWinPct } = scoreMatchup(fighterA, fighterB, context);
  const noise = stableNoise(fighterA.id, fighterB.id);
  const center = baseAWinPct + noise;

  // Triangle-like discrete samples around center (±6 pts)
  let wins = 0;
  const half = Math.floor(samples / 2);
  for (let i = -half; i <= half; i += 1) {
    const sample = center + (i / half) * 6;
    if (sample >= 50) wins += 1;
  }
  let fighterAWinPct = Math.round((wins / samples) * 100);
  fighterAWinPct = Math.min(78, Math.max(22, fighterAWinPct));
  return {
    fighterAWinPct,
    fighterBWinPct: 100 - fighterAWinPct,
  };
}
