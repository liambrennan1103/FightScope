import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { readServerEnv } from "@/server/runtime-env";

/** Cost-efficient model for structured MMA narrative (MVP). Override via ANTHROPIC_MODEL. */
export const ANTHROPIC_MODEL =
  readServerEnv("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";

export function hasAnthropicApiKey(): boolean {
  return Boolean(readServerEnv("ANTHROPIC_API_KEY"));
}

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  const apiKey = readServerEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

export type AnthropicCallFailureKind =
  | "missing_key"
  | "rate_limit"
  | "insufficient_credits"
  | "timeout"
  | "api_error"
  | "invalid_response";

export class AnthropicCallError extends Error {
  readonly kind: AnthropicCallFailureKind;
  readonly status?: number;

  constructor(kind: AnthropicCallFailureKind, message: string, status?: number) {
    super(message);
    this.name = "AnthropicCallError";
    this.kind = kind;
    this.status = status;
  }
}

export function classifyAnthropicError(error: unknown): AnthropicCallError {
  if (error instanceof AnthropicCallError) return error;

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const name = error instanceof Error ? error.name.toLowerCase() : "";

  if (
    message.includes("api key") ||
    message.includes("not configured") ||
    name.includes("authentication") ||
    status === 401
  ) {
    return new AnthropicCallError("missing_key", "AI analysis is not configured.", status);
  }
  if (status === 429 || message.includes("rate limit") || message.includes("rate_limit")) {
    return new AnthropicCallError(
      "rate_limit",
      "AI analysis is temporarily rate-limited. Try again shortly.",
      status,
    );
  }
  if (
    status === 402 ||
    message.includes("credit") ||
    message.includes("billing") ||
    message.includes("insufficient")
  ) {
    return new AnthropicCallError(
      "insufficient_credits",
      "AI analysis is temporarily unavailable.",
      status,
    );
  }
  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("abort") ||
    message.includes("network") ||
    name.includes("timeout") ||
    name.includes("connection")
  ) {
    return new AnthropicCallError(
      "timeout",
      "AI analysis timed out. Try again.",
      status,
    );
  }
  return new AnthropicCallError("api_error", "AI analysis failed.", status);
}
