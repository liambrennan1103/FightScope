import type { FightOutcome, Prediction } from "@/lib/types";

export type MethodKind = "koTko" | "submission" | "decision" | "draw" | "unknown";

export type PredictionEvaluation = {
  winnerCorrect: boolean | null;
  methodCorrect: boolean | null;
  predictedWinnerId: string;
  actualWinnerId: string | null;
  predictedMethod: MethodKind;
  predictedMethodLabel: string;
  actualMethod: MethodKind;
  actualMethodLabel: string | null;
};

export function normalizeMethodKind(raw: string | null | undefined): MethodKind {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();
  if (s === "draw" || s.includes("draw") || s.includes("majority draw")) return "draw";
  if (
    s === "kotko" ||
    s === "ko/tko" ||
    s.includes("knockout") ||
    s.includes("tko") ||
    /(^|[^a-z])ko([^a-z]|$)/.test(s)
  ) {
    return "koTko";
  }
  if (s.includes("sub")) return "submission";
  if (s.includes("dec")) return "decision";
  return "unknown";
}

export function methodKindLabel(kind: MethodKind): string {
  switch (kind) {
    case "koTko":
      return "KO/TKO";
    case "submission":
      return "Submission";
    case "decision":
      return "Decision";
    case "draw":
      return "Draw";
    default:
      return "Unknown";
  }
}

export function predictedMethodFromPrediction(prediction: Prediction): {
  kind: MethodKind;
  label: string;
} {
  const path = prediction.mostLikelyPath;
  if (path?.method) {
    const kind = normalizeMethodKind(path.method);
    return {
      kind: kind === "unknown" ? normalizeMethodKind(path.label) : kind,
      label: path.label || methodKindLabel(kind),
    };
  }

  const methods = prediction.methods;
  const entries: Array<{ kind: MethodKind; pct: number }> = [
    { kind: "koTko", pct: methods.koTko },
    { kind: "submission", pct: methods.submission },
    { kind: "decision", pct: methods.decision },
  ];
  entries.sort((a, b) => b.pct - a.pct);
  const top = entries[0]!;
  return { kind: top.kind, label: methodKindLabel(top.kind) };
}

/**
 * Deterministic evaluation — no model calls.
 * Compares frozen prediction against catalog Fight.outcome.
 */
export function evaluatePrediction(
  prediction: Prediction,
  outcome: FightOutcome | null | undefined,
): PredictionEvaluation | null {
  if (!outcome) return null;

  const predicted = predictedMethodFromPrediction(prediction);
  const actualKind = normalizeMethodKind(outcome.method);
  const actualLabel = outcome.method;

  const winnerCorrect =
    outcome.winnerId == null && predicted.kind === "draw"
      ? true
      : outcome.winnerId != null
        ? outcome.winnerId === prediction.predictedWinnerId
        : null;

  const methodCorrect =
    predicted.kind === "unknown" || actualKind === "unknown"
      ? null
      : predicted.kind === actualKind;

  return {
    winnerCorrect,
    methodCorrect,
    predictedWinnerId: prediction.predictedWinnerId,
    actualWinnerId: outcome.winnerId,
    predictedMethod: predicted.kind,
    predictedMethodLabel: predicted.label,
    actualMethod: actualKind,
    actualMethodLabel: actualLabel,
  };
}

export function drawPctFromPrediction(prediction: Prediction): number {
  return prediction.jointOutcomes?.draw ?? 0;
}
