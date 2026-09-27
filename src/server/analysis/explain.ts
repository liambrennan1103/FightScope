import "server-only";

import type { Confidence, Fighter, MethodDistribution, Prediction } from "@/lib/types";
import {
  ANTHROPIC_MODEL,
  AnthropicCallError,
  classifyAnthropicError,
  getAnthropicClient,
  hasAnthropicApiKey,
} from "@/server/analysis/anthropic";

type LlmNarrative = {
  fightscopeRead: string;
  howAWins: string;
  howBWins: string;
  fighterAAdvantages?: string[];
  fighterBAdvantages?: string[];
  keyFactors?: string[];
  likelyScenarios?: Array<{ scenario: string; explanation: string }>;
  likelyMethod?: string;
  likelyRound?: string | null;
  analysis?: string;
  fighterAWinPct?: number;
  fighterBWinPct?: number;
  confidence?: Confidence;
  methods?: MethodDistribution;
};

export type LlmEnrichment = {
  analysis: Prediction["analysis"];
  source: "llm" | "template";
  keyAdvantages?: Prediction["keyAdvantages"];
  /**
   * @deprecated Claude no longer supplies numerical probabilities.
   * Structural prediction_engine_v3 owns win% / methods / joint outcomes.
   */
  probabilities?: {
    fighterAWinPct: number;
    fighterBWinPct: number;
    confidence: Confidence;
    methods: MethodDistribution;
  };
};

function compactStat(value: number | null | undefined, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "n/a";
  return `${value}${suffix}`;
}

function fighterFacts(label: string, fighter: Fighter): string {
  const recent = fighter.recentFights
    .slice(0, 5)
    .map(
      (fight) =>
        `${fight.date}: ${fight.result} vs ${fight.opponentName}` +
        (fight.method ? ` (${fight.method}${fight.round != null ? ` R${fight.round}` : ""})` : ""),
    )
    .join("; ");

  const attrs = Object.entries(fighter.attributes)
    .map(([key, value]) => `${key}:${value}`)
    .join(", ");

  return [
    `${label}: ${fighter.name}`,
    `record: ${fighter.record.wins}-${fighter.record.losses}-${fighter.record.draws}`,
    `division: ${fighter.division ?? "n/a"}`,
    `age: ${fighter.age ?? "n/a"}`,
    `heightCm: ${fighter.heightCm ?? "n/a"}`,
    `reachCm: ${fighter.reachCm ?? "n/a"}`,
    `stance: ${fighter.stance ?? "n/a"}`,
    `attributes: ${attrs || "n/a"}`,
    `SLpM: ${compactStat(fighter.statistics.sigStrikesLandedPerMin)}`,
    `strAcc: ${compactStat(fighter.statistics.sigStrikeAccuracy, "%")}`,
    `SApM: ${compactStat(fighter.statistics.sigStrikesAbsorbedPerMin)}`,
    `strDef: ${compactStat(fighter.statistics.strikingDefense, "%")}`,
    `TD/15: ${compactStat(fighter.statistics.takedownsPer15)}`,
    `TDAcc: ${compactStat(fighter.statistics.takedownAccuracy, "%")}`,
    `TDDef: ${compactStat(fighter.statistics.takedownDefense, "%")}`,
    `SUB/15: ${compactStat(fighter.statistics.submissionAttemptsPer15)}`,
    `KD/15: ${compactStat(fighter.statistics.knockdownsPer15)}`,
    `finishes KO/TKO: ${fighter.finishes.koTko ?? "n/a"} / SUB: ${fighter.finishes.submissions ?? "n/a"}`,
    `recent: ${recent || "n/a"}`,
  ].join("\n");
}

function matchupPrompt(fighterA: Fighter, fighterB: Fighter, baseline: Prediction): string {
  const factors =
    baseline.topFactors
      ?.slice(0, 6)
      .map(
        (f) =>
          `${f.label}: ${f.edge} (${f.magnitude > 0 ? "+" : ""}${f.magnitude.toFixed(2)})`,
      )
      .join("; ") ?? "n/a";

  const joint = baseline.jointOutcomes;
  const jointLine = joint
    ? `Joint paths%: A_KO ${joint.aKoTko} A_SUB ${joint.aSubmission} A_DEC ${joint.aDecision} | B_KO ${joint.bKoTko} B_SUB ${joint.bSubmission} B_DEC ${joint.bDecision} | draw ${joint.draw}`
    : "n/a";

  return [
    "TASK: Explain FightScope's ALREADY COMPUTED prediction in clear MMA analysis prose.",
    "Do NOT invent or change win probabilities, method probabilities, or the predicted winner.",
    "",
    "FIGHTER DATA (factual — never invent missing rates/records/finishes):",
    fighterFacts("FIGHTER A", fighterA),
    "",
    fighterFacts("FIGHTER B", fighterB),
    "",
    "LOCKED STRUCTURAL PREDICTION (authoritative — copy these numbers into prose, do not revise):",
    `Win%: A ${baseline.fighterAWinPct} / B ${baseline.fighterBWinPct}`,
    `Methods%: KO/TKO ${baseline.methods.koTko}, DEC ${baseline.methods.decision}, SUB ${baseline.methods.submission}`,
    jointLine,
    `Most likely path: ${baseline.mostLikelyPath?.label ?? "n/a"} (${baseline.mostLikelyPath?.pct ?? "n/a"}%)`,
    `Predicted winner id: ${baseline.predictedWinnerId}`,
    `Confidence: ${baseline.confidence}`,
    `Coverage: ${baseline.coverageLevel ?? "n/a"}`,
    `Model factors: ${factors}`,
    `Edges A: ${baseline.keyAdvantages.fighterA.join(", ") || "n/a"}`,
    `Edges B: ${baseline.keyAdvantages.fighterB.join(", ") || "n/a"}`,
    "",
    "Rules:",
    "- Use only supplied verified FightScope data.",
    "- If a statistic is missing/n/a, say so — do not fabricate it.",
    "- Do not invent injuries, camps, short notice, psychology, or rumors.",
    "- Explain WHY the structural model leaned this way using the listed factors.",
    "- Do not infer numerical facts not present in input.",
    "- Do not modify probabilities, method shares, or most-likely path.",
    "- Do not create reasons not present in Model factors / Edges.",
    "- If evidence is weak or coverage is LOW, state that the model has limited evidence.",
    "- Keep fightscopeRead/howAWins/howBWins to 1-3 short sentences each.",
  ].join("\n");
}

export function templateExplanation(
  fighterA: Fighter,
  fighterB: Fighter,
  prediction: Prediction,
): Prediction["analysis"] {
  const pick = prediction.predictedWinnerId === fighterA.id ? fighterA : fighterB;
  const pickPct =
    prediction.predictedWinnerId === fighterA.id
      ? prediction.fighterAWinPct
      : prediction.fighterBWinPct;
  const aEdge = prediction.keyAdvantages.fighterA[0] ?? "overall balance";
  const bEdge = prediction.keyAdvantages.fighterB[0] ?? "overall balance";
  return {
    howAWins: `${fighterA.lastName} paths to victory center on ${aEdge.toLowerCase()}, with method lean reflecting KO/TKO ${prediction.methods.koTko}%, decision ${prediction.methods.decision}%, submission ${prediction.methods.submission}%.`,
    howBWins: `${fighterB.lastName} paths to victory center on ${bEdge.toLowerCase()}. FightScope does not invent strike totals beyond the structured rates above.`,
    fightscopeRead: `Structured FightScope read: ${pick.lastName} ${pickPct}% (${prediction.confidence}). Advantages A [${prediction.keyAdvantages.fighterA.join(", ") || "none"}] vs B [${prediction.keyAdvantages.fighterB.join(", ") || "none"}].`,
  };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch {
        const repaired = slice.replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(repaired);
      }
    }
    throw new AnthropicCallError("invalid_response", "AI returned malformed JSON.");
  }
}

function asStringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim().replace(/%/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Normalize two sides to integers that sum to exactly 100, clamped to [12, 88]. */
export function normalizeWinPercentages(
  rawA: number,
  rawB: number,
): { fighterAWinPct: number; fighterBWinPct: number } | null {
  if (!Number.isFinite(rawA) || !Number.isFinite(rawB)) return null;
  if (rawA < 0 || rawB < 0) return null;
  const sum = rawA + rawB;
  if (sum <= 0) return null;
  let a = Math.round((rawA / sum) * 100);
  a = Math.min(88, Math.max(12, a));
  const b = 100 - a;
  if (a + b !== 100) return null;
  return { fighterAWinPct: a, fighterBWinPct: b };
}

export function normalizeMethodPercentages(
  koTko: number,
  decision: number,
  submission: number,
): MethodDistribution | null {
  if (![koTko, decision, submission].every((n) => Number.isFinite(n) && n >= 0)) return null;
  const sum = koTko + decision + submission;
  if (sum <= 0) return null;
  let ko = Math.round((koTko / sum) * 100);
  let dec = Math.round((decision / sum) * 100);
  let sub = 100 - ko - dec;
  if (sub < 0) {
    dec += sub;
    sub = 0;
  }
  // Fix rounding drift
  const fix = 100 - (ko + dec + sub);
  dec += fix;
  if (ko < 0 || dec < 0 || sub < 0 || ko + dec + sub !== 100) return null;
  return { koTko: ko, decision: dec, submission: sub };
}

function parseConfidence(value: unknown, gap: number): Confidence {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high") {
    return (raw.charAt(0).toUpperCase() + raw.slice(1)) as Confidence;
  }
  if (gap >= 18) return "High";
  if (gap >= 8) return "Medium";
  return "Low";
}

function parseNarrative(raw: unknown): LlmNarrative | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const fightscopeRead = String(obj.fightscopeRead ?? obj.summary ?? obj.analysis ?? "").trim();
  const howAWins = String(obj.howAWins ?? "").trim();
  const howBWins = String(obj.howBWins ?? "").trim();
  if (!fightscopeRead || !howAWins || !howBWins) return null;

  const scenarios = Array.isArray(obj.likelyScenarios)
    ? obj.likelyScenarios
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const scenario = String((item as { scenario?: unknown }).scenario ?? "").trim();
          const explanation = String((item as { explanation?: unknown }).explanation ?? "").trim();
          if (!scenario || !explanation) return null;
          return { scenario, explanation };
        })
        .filter((item): item is { scenario: string; explanation: string } => Boolean(item))
        .slice(0, 3)
    : undefined;

  const methodsObj =
    obj.methods && typeof obj.methods === "object"
      ? (obj.methods as Record<string, unknown>)
      : null;

  const confidenceRaw = String(obj.confidence ?? "").trim();
  const confidence =
    confidenceRaw === "Low" || confidenceRaw === "Medium" || confidenceRaw === "High"
      ? (confidenceRaw as Confidence)
      : undefined;

  return {
    fightscopeRead: fightscopeRead.slice(0, 1200),
    howAWins: howAWins.slice(0, 800),
    howBWins: howBWins.slice(0, 800),
    fighterAAdvantages: asStringList(obj.fighterAAdvantages, 4),
    fighterBAdvantages: asStringList(obj.fighterBAdvantages, 4),
    keyFactors: asStringList(obj.keyFactors, 5),
    likelyScenarios: scenarios,
    likelyMethod:
      typeof obj.likelyMethod === "string" ? obj.likelyMethod.trim().slice(0, 120) : undefined,
    likelyRound:
      obj.likelyRound == null
        ? null
        : typeof obj.likelyRound === "string"
          ? obj.likelyRound.trim().slice(0, 40)
          : String(obj.likelyRound),
    analysis: typeof obj.analysis === "string" ? obj.analysis.trim().slice(0, 1200) : undefined,
    fighterAWinPct: asFiniteNumber(obj.fighterAWinPct) ?? undefined,
    fighterBWinPct: asFiniteNumber(obj.fighterBWinPct) ?? undefined,
    confidence,
    methods: methodsObj
      ? {
          koTko: asFiniteNumber(methodsObj.koTko) ?? 0,
          decision: asFiniteNumber(methodsObj.decision) ?? 0,
          submission: asFiniteNumber(methodsObj.submission) ?? 0,
        }
      : undefined,
  };
}

function enrichRead(base: string, _narrative: LlmNarrative): string {
  // Keep fightscopeRead as narrative only — method/scenarios are separate UI channels.
  return base
    .replace(/\s*Data quality:\s*[^.]*\.?/gi, " ")
    .replace(/\s*Likely method lean:\s*[^.|(]+(?:\([^)]*\))?\.?/gi, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 1200);
}

/**
 * Apply Claude narrative enrichment onto a structural baseline prediction.
 * Numerical win% / methods / joint outcomes are NEVER overridden by the LLM.
 */
export function applyLlmEnrichment(
  fighterA: Fighter,
  fighterB: Fighter,
  baseline: Prediction,
  enrichment: LlmEnrichment,
): Prediction {
  void fighterA;
  void fighterB;
  return {
    ...baseline,
    analysis: enrichment.analysis,
    ...(enrichment.keyAdvantages ? { keyAdvantages: enrichment.keyAdvantages } : {}),
  };
}

/**
 * LLM layer: explanation only. Structural engine owns probabilities.
 */
export async function explainPrediction(
  fighterA: Fighter,
  fighterB: Fighter,
  prediction: Prediction,
): Promise<LlmEnrichment> {
  const fallback = templateExplanation(fighterA, fighterB, prediction);
  if (!hasAnthropicApiKey()) {
    return { analysis: fallback, source: "template" };
  }

  const prompt = matchupPrompt(fighterA, fighterB, prediction);

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 1200,
        temperature: 0.25,
        system: [
          "You are FightScope's explanation layer.",
          "Win probabilities and method probabilities are already computed by FightScope's structural model.",
          "You MUST NOT invent, revise, or contradict those locked numbers.",
          "Use only supplied verified FightScope data. Never invent missing statistics.",
          "Do not invent injuries, camps, short notice, psychology, or rumors.",
          "Keep fightscopeRead/howAWins/howBWins to 1-3 short sentences each.",
          "Limit each string array to at most 3 short items.",
          "Limit likelyScenarios to at most 2 objects.",
          "Tone: analytical, premium, concise.",
        ].join(" "),
        messages: [
          {
            role: "user",
            content: `${prompt}\n\nProduce the FightScope explanation JSON now.`,
          },
        ],
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "fightscopeRead",
                "howAWins",
                "howBWins",
                "fighterAAdvantages",
                "fighterBAdvantages",
                "keyFactors",
                "likelyScenarios",
                "analysis",
              ],
              properties: {
                fightscopeRead: { type: "string" },
                howAWins: { type: "string" },
                howBWins: { type: "string" },
                fighterAAdvantages: {
                  type: "array",
                  items: { type: "string" },
                },
                fighterBAdvantages: {
                  type: "array",
                  items: { type: "string" },
                },
                keyFactors: {
                  type: "array",
                  items: { type: "string" },
                },
                likelyScenarios: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["scenario", "explanation"],
                    properties: {
                      scenario: { type: "string" },
                      explanation: { type: "string" },
                    },
                  },
                },
                analysis: { type: "string" },
              },
            },
          },
        },
      },
      { timeout: 30_000 },
    );

    if (response.stop_reason === "max_tokens") {
      console.error("FightScope Anthropic explain truncated");
      return { analysis: fallback, source: "template" };
    }

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      return { analysis: fallback, source: "template" };
    }

    const narrative = parseNarrative(extractJsonObject(text));
    if (!narrative) {
      return { analysis: fallback, source: "template" };
    }

    const keyAdvantages =
      narrative.fighterAAdvantages?.length || narrative.fighterBAdvantages?.length
        ? {
            fighterA:
              narrative.fighterAAdvantages?.length
                ? narrative.fighterAAdvantages
                : prediction.keyAdvantages.fighterA,
            fighterB:
              narrative.fighterBAdvantages?.length
                ? narrative.fighterBAdvantages
                : prediction.keyAdvantages.fighterB,
          }
        : undefined;

    return {
      source: "llm",
      keyAdvantages,
      analysis: {
        fightscopeRead: enrichRead(narrative.fightscopeRead, narrative),
        howAWins: narrative.howAWins,
        howBWins: narrative.howBWins,
      },
    };
  } catch (error) {
    const classified = classifyAnthropicError(error);
    if (classified.kind === "missing_key") {
      return { analysis: fallback, source: "template" };
    }
    console.error("FightScope Anthropic explain failed", {
      kind: classified.kind,
      status: classified.status,
      name: error instanceof Error ? error.name : "unknown",
      detail:
        error instanceof Error
          ? error.message.replace(/sk-ant-[A-Za-z0-9_-]+/gi, "[REDACTED]").slice(0, 180)
          : "non-error",
    });
    return { analysis: fallback, source: "template" };
  }
}

export type StarterLlmResult = {
  source: "llm" | "template";
  fighterAWinPct: number;
  fighterBWinPct: number;
  drawPct: number;
  confidence: Confidence;
  keyMatchupFactors: string[];
  shortRead: string;
};

/**
 * Compact Starter enrichment — percentages + key factors only.
 * Does not request Deep Analysis, scenarios, or long path-to-victory prose.
 */
export async function explainStarter(
  fighterA: Fighter,
  fighterB: Fighter,
  prediction: Prediction,
): Promise<StarterLlmResult> {
  const factorsFallback = [
    ...prediction.keyAdvantages.fighterA.slice(0, 2),
    ...prediction.keyAdvantages.fighterB.slice(0, 2),
  ]
    .filter(Boolean)
    .slice(0, 5);
  while (factorsFallback.length < 3) {
    factorsFallback.push(
      ["Striking efficiency", "Grappling threat", "Defensive reliability", "Recent form"][
        factorsFallback.length
      ]!,
    );
  }

  const template: StarterLlmResult = {
    source: "template",
    fighterAWinPct: prediction.fighterAWinPct,
    fighterBWinPct: prediction.fighterBWinPct,
    drawPct: 0,
    confidence: prediction.confidence,
    keyMatchupFactors: factorsFallback.slice(0, 5),
    shortRead: `${
      prediction.predictedWinnerId === fighterA.id ? fighterA.lastName : fighterB.lastName
    } holds the edge on current rates and stylistic fit.`,
  };

  if (!hasAnthropicApiKey()) return template;

  const prompt = [
    "TASK: Produce a compact FightScope STARTER prediction.",
    "Return ONLY win probabilities, optional draw, and 3-5 key matchup factors.",
    "Do NOT write deep analysis, scenarios, or long essays.",
    "",
    fighterFacts("FIGHTER A", fighterA),
    "",
    fighterFacts("FIGHTER B", fighterB),
    "",
    `Baseline: A ${prediction.fighterAWinPct} / B ${prediction.fighterBWinPct}`,
    "fighterAWinPct + drawPct + fighterBWinPct MUST equal 100.",
    "drawPct is usually 0; only use a small draw when truly warranted.",
    "Clamp each fighter win side between 12 and 88 when draw is 0.",
    "keyMatchupFactors: 3 to 5 short labels (not paragraphs).",
    "shortRead: one concise sentence.",
  ].join("\n");

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 500,
        temperature: 0.2,
        system: [
          "You are FightScope Starter analysis.",
          "Output calibrated win probabilities and concise key factors only.",
          "Never invent missing stats. Never claim certainty.",
        ].join(" "),
        messages: [{ role: "user", content: `${prompt}\n\nReturn JSON now.` }],
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "fighterAWinPct",
                "drawPct",
                "fighterBWinPct",
                "keyMatchupFactors",
                "shortRead",
                "confidence",
              ],
              properties: {
                fighterAWinPct: { type: "integer" },
                drawPct: { type: "integer" },
                fighterBWinPct: { type: "integer" },
                keyMatchupFactors: { type: "array", items: { type: "string" } },
                shortRead: { type: "string" },
                confidence: { type: "string", enum: ["Low", "Medium", "High"] },
              },
            },
          },
        },
      },
      { timeout: 25_000 },
    );

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!text) return template;

    const raw = extractJsonObject(text) as Record<string, unknown> | null;
    if (!raw) return template;

    let a = Number(raw.fighterAWinPct);
    let b = Number(raw.fighterBWinPct);
    let d = Number(raw.drawPct);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return template;
    if (!Number.isFinite(d) || d < 0) d = 0;
    a = Math.round(a);
    b = Math.round(b);
    d = Math.round(d);
    const sum = a + b + d;
    if (sum <= 0) return template;
    if (sum !== 100) {
      a = Math.round((a / sum) * 100);
      b = Math.round((b / sum) * 100);
      d = Math.max(0, 100 - a - b);
    }
    if (d === 0) {
      const win = normalizeWinPercentages(a, b);
      if (!win) return template;
      a = win.fighterAWinPct;
      b = win.fighterBWinPct;
    }

    const factors = Array.isArray(raw.keyMatchupFactors)
      ? raw.keyMatchupFactors
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    if (factors.length < 3) {
      for (const item of factorsFallback) {
        if (factors.length >= 5) break;
        if (!factors.includes(item)) factors.push(item);
      }
    }

    return {
      source: "llm",
      fighterAWinPct: a,
      fighterBWinPct: b,
      drawPct: d,
      confidence: parseConfidence(String(raw.confidence ?? ""), Math.abs(a - b)),
      keyMatchupFactors: factors.slice(0, 5),
      shortRead: String(raw.shortRead ?? template.shortRead).trim().slice(0, 280),
    };
  } catch (error) {
    console.error("FightScope starter predict failed", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return template;
  }
}
