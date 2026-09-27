/**
 * Developer diagnostic for extreme FightScope win probabilities.
 * Used by selftests / backtests — not exposed in the consumer UI.
 */
export type ExtremeConfidenceFlag = {
  maxWinPct: number;
  over80: boolean;
  over90: boolean;
  band: "normal" | "high" | "extreme";
};

export function flagExtremeConfidence(
  fighterAWinPct: number,
  fighterBWinPct: number,
): ExtremeConfidenceFlag {
  const maxWinPct = Math.max(fighterAWinPct, fighterBWinPct);
  const over90 = maxWinPct >= 90;
  const over80 = maxWinPct >= 80;
  return {
    maxWinPct,
    over80,
    over90,
    band: over90 ? "extreme" : over80 ? "high" : "normal",
  };
}
