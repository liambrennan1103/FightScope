import type { FightStatus, Prediction } from "@/lib/types";

/** Real-world fight lifecycle — independent from FightScope AI analysis. */
export type RealFightStatus = FightStatus;

/**
 * FightScope AI analysis lifecycle for a specific matchup view.
 * Do NOT infer this from whether fighter statistics exist.
 */
export type AnalysisStatus = "NOT_ANALYZED" | "ANALYZING" | "ANALYZED" | "ERROR" | "STALE";

export type AnalysisPhase =
  | "idle"
  | "striking"
  | "grappling"
  | "form"
  | "scenarios"
  | "probabilities";

export const ANALYSIS_PHASE_COPY: Record<Exclude<AnalysisPhase, "idle">, string> = {
  striking: "Analyzing striking profiles…",
  grappling: "Comparing grappling metrics…",
  form: "Evaluating recent form…",
  scenarios: "Building fight scenarios…",
  probabilities: "Calculating matchup probabilities…",
};

export const ANALYSIS_PHASE_ORDER: Exclude<AnalysisPhase, "idle">[] = [
  "striking",
  "grappling",
  "form",
  "scenarios",
  "probabilities",
];

export function analysisStatusLabel(status: AnalysisStatus): string {
  switch (status) {
    case "NOT_ANALYZED":
      return "Not analyzed";
    case "ANALYZING":
      return "Analyzing";
    case "ANALYZED":
      return "Analysis available";
    case "ERROR":
      return "Analysis failed";
    case "STALE":
      return "Refresh recommended";
  }
}

export function realFightStatusLabel(status: RealFightStatus): string {
  switch (status) {
    case "upcoming":
      return "Upcoming";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

export function deriveInitialAnalysisStatus(opts: {
  savedPrediction: Prediction | null | undefined;
  initialPrediction?: Prediction | null;
}): AnalysisStatus {
  if (opts.initialPrediction || opts.savedPrediction) return "ANALYZED";
  return "NOT_ANALYZED";
}
