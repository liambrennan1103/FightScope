import "server-only";

export {
  assessDataQuality,
  qualityNote,
  type AnalysisDataQuality,
} from "@/lib/data-quality";

export const PROMPT_VERSION = "fs-predict-anthropic-v2";
export const AI_VERSION =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";
