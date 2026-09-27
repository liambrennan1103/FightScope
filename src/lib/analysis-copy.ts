import type { Fighter, MethodDistribution, Prediction } from "@/lib/types";

const DATA_QUALITY_RE = /\s*Data quality:\s*[^.]*\.?/gi;
const SCENARIOS_PREFIX_RE = /\s*Scenarios:\s*/i;
const KEY_FACTORS_PREFIX_RE = /\s*Key factors:\s*[^.]*\.?/gi;
const LIKELY_METHOD_BLOCK_RE =
  /\s*Likely method lean:\s*[^.|(]+(?:\([^)]*\))?\.?/gi;
const STUCK_METHOD_TAIL_RE =
  /\.(Decision|Submission|KO\/TKO|Finish)\.?\s*$/;

/** Strip internal/debug copy and fix common punctuation glitches before any user display. */
export function sanitizeAnalysisCopy(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(DATA_QUALITY_RE, " ")
    .replace(KEY_FACTORS_PREFIX_RE, " ")
    .replace(LIKELY_METHOD_BLOCK_RE, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Final display polish — never allow glued tokens like "attributes.Decision." */
export function finalizeDisplayCopy(raw: string | null | undefined): string {
  let text = sanitizeAnalysisCopy(raw);
  text = text.replace(STUCK_METHOD_TAIL_RE, ".").trim();
  text = text.replace(/([a-z])([A-Z])/g, "$1 $2");
  text = text.replace(/\.{2,}/g, ".").replace(/\s{2,}/g, " ").trim();
  if (text && !/[.!?]$/.test(text)) text = `${text}.`;
  return text;
}

export type FightScenarioCard = {
  title: string;
  body: string;
  method: "decision" | "finish" | "other";
  methodLabel: string;
};

export type EdgeTextSegment =
  | { type: "text"; value: string }
  | { type: "stat"; value: string; advantage: boolean };

export type EdgeReasonCard = {
  kind: "form" | "cardio" | "striking" | "reach" | "method";
  /** Matches Key matchup factor row id, or "method" for the method card. */
  factorKey: "recentForm" | "cardio" | "striking" | "reach" | "method";
  title: string;
  segments: EdgeTextSegment[];
};

export type PredictedEdgeContent = {
  /** Level 1 — single central claim. */
  headline: string;
  /** Level 2 — concrete reasons tied to displayed metrics. */
  reasons: EdgeReasonCard[];
  methodLabel: string;
  methodKind: "decision" | "finish" | "other";
  /** Level 3 — how the fight can unfold (not why). */
  scenarios: FightScenarioCard[];
};

function firstSentences(text: string, max: number): string {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return finalizeDisplayCopy(parts.slice(0, max).join(" "));
}

function dominantMethod(
  methods: MethodDistribution | null | undefined,
  mostLikelyPath?: Prediction["mostLikelyPath"],
): {
  label: string;
  kind: "decision" | "finish" | "other";
  share: number;
} {
  if (mostLikelyPath && mostLikelyPath.pct > 0) {
    const method = mostLikelyPath.method;
    if (method === "decision") {
      return { label: "Decision", kind: "decision", share: mostLikelyPath.pct };
    }
    if (method === "submission") {
      return { label: "Submission", kind: "finish", share: mostLikelyPath.pct };
    }
    if (method === "koTko") {
      return { label: "KO/TKO", kind: "finish", share: mostLikelyPath.pct };
    }
  }
  if (!methods) return { label: "Decision", kind: "decision", share: 0 };
  const entries: Array<{ label: string; kind: "decision" | "finish"; value: number }> = [
    { label: "Decision", kind: "decision", value: methods.decision },
    { label: "KO/TKO", kind: "finish", value: methods.koTko },
    { label: "Submission", kind: "finish", value: methods.submission },
  ];
  entries.sort((a, b) => b.value - a.value);
  const top = entries[0]!;
  return { label: top.label, kind: top.kind, share: top.value };
}

function extractLikelyMethod(text: string): string | null {
  const m = text.match(/Likely method lean:\s*([^.|(]+)/i);
  return m?.[1]?.trim() || null;
}

function stripScenarioAppendix(text: string): string {
  const idx = text.search(SCENARIOS_PREFIX_RE);
  if (idx >= 0) return text.slice(0, idx).trim();
  if (text.includes(" | ") && /scenario|decision|finish|tko|submission/i.test(text)) {
    const pipeIdx = text.indexOf(" | ");
    if (pipeIdx > text.length * 0.35) return text.slice(0, pipeIdx).trim();
  }
  return text;
}

/**
 * Split raw analysis into isolated prose (no method/scenario appendix)
 * and an optional method label extracted from the appendix.
 */
export function isolateAnalysisFields(raw: string): {
  prose: string;
  methodFromText: string | null;
} {
  const methodFromText = extractLikelyMethod(raw);
  let prose = stripScenarioAppendix(raw);
  prose = prose.replace(LIKELY_METHOD_BLOCK_RE, " ");
  prose = finalizeDisplayCopy(prose);
  return { prose, methodFromText };
}

function resolveMethodKind(label: string): {
  label: string;
  kind: "decision" | "finish" | "other";
} {
  const lower = label.toLowerCase();
  if (/decision/.test(lower)) return { label: "Decision", kind: "decision" };
  if (/sub/.test(lower)) return { label: "Submission", kind: "finish" };
  if (/ko|tko/.test(lower)) return { label: "KO/TKO", kind: "finish" };
  if (/finish/.test(lower)) return { label: "Finish", kind: "finish" };
  return { label: label.slice(0, 40), kind: "other" };
}

type AttrKey = "striking" | "recentForm" | "cardio";

type MetricDiff = {
  key: AttrKey | "reach";
  label: string;
  unit: string;
  winnerValue: number;
  loserValue: number;
  delta: number;
};

function attrScore(fighter: Fighter, key: AttrKey): number | null {
  const n = Number(fighter.attributes[key]);
  return Number.isFinite(n) ? n : null;
}

function collectMetricDiffs(winner: Fighter, loser: Fighter): MetricDiff[] {
  const out: MetricDiff[] = [];

  const reachW = winner.reachCm;
  const reachL = loser.reachCm;
  if (reachW != null && reachL != null && Number.isFinite(reachW) && Number.isFinite(reachL)) {
    out.push({
      key: "reach",
      label: "Reach",
      unit: "cm",
      winnerValue: Math.round(reachW),
      loserValue: Math.round(reachL),
      delta: Math.abs(reachW - reachL),
    });
  }

  for (const [key, label] of [
    ["striking", "Striking"],
    ["recentForm", "Recent form"],
    ["cardio", "Cardio"],
  ] as const) {
    const w = attrScore(winner, key);
    const l = attrScore(loser, key);
    if (w == null || l == null) continue;
    out.push({
      key,
      label,
      unit: "/100",
      winnerValue: Math.round(w),
      loserValue: Math.round(l),
      delta: Math.abs(w - l),
    });
  }

  return out;
}

function formatScore(value: number, unit: string): string {
  return unit === "/100" ? `${value}/100` : `${value} ${unit}`;
}

function buildHeadline(winner: Fighter, loser: Fighter, diffs: MetricDiff[]): string {
  const form = diffs.find((d) => d.key === "recentForm");
  const cardio = diffs.find((d) => d.key === "cardio");
  const striking = diffs.find((d) => d.key === "striking");

  const formLead = form && form.winnerValue > form.loserValue && form.delta >= 3;
  const cardioLead = cardio && cardio.winnerValue > cardio.loserValue && cardio.delta >= 2;
  const strikingEven =
    striking != null && Math.abs(striking.winnerValue - striking.loserValue) <= 2;
  const strikingLead =
    striking && striking.winnerValue > striking.loserValue && striking.delta >= 3;

  const bits: string[] = [];
  if (formLead) bits.push("stronger recent form");
  else if (form && form.delta < 3) bits.push("similar recent form");
  if (cardioLead) bits.push(bits.length ? "a slight cardio lean" : "a cardio lean");
  if (strikingLead) bits.push("a striking edge");
  else if (strikingEven) bits.push("striking essentially even");

  if (bits.length === 0) {
    return finalizeDisplayCopy(
      `${winner.lastName} holds the matchup edge on current rates versus ${loser.lastName}`,
    );
  }

  if (bits.length === 1) {
    return finalizeDisplayCopy(`${winner.lastName} holds the edge — ${bits[0]}`);
  }

  const last = bits[bits.length - 1]!;
  const head = bits.slice(0, -1).join(", ");
  return finalizeDisplayCopy(`${winner.lastName} holds the edge — ${head}, with ${last}`);
}

function reasonFromDiff(
  winner: Fighter,
  loser: Fighter,
  diff: MetricDiff,
): EdgeReasonCard | null {
  const wStat = formatScore(diff.winnerValue, diff.unit);
  const lStat = formatScore(diff.loserValue, diff.unit);
  const winnerLeads = diff.winnerValue >= diff.loserValue;
  const kind =
    diff.key === "recentForm"
      ? "form"
      : diff.key === "cardio"
        ? "cardio"
        : diff.key === "striking"
          ? "striking"
          : "reach";

  if (diff.key === "recentForm") {
    if (diff.delta < 2) return null;
    if (winnerLeads) {
      return {
        kind,
        factorKey: "recentForm",
        title: "Recent form",
        segments: [
          { type: "text", value: `${winner.lastName} is peaking harder right now (recent form: ` },
          { type: "stat", value: wStat, advantage: true },
          { type: "text", value: ` against ` },
          { type: "stat", value: lStat, advantage: false },
          { type: "text", value: ` for ${loser.lastName}).` },
        ],
      };
    }
    return {
      kind,
      factorKey: "recentForm",
      title: `Weak spot — ${winner.lastName}`,
      segments: [
        {
          type: "text",
          value: `${winner.lastName}'s form trails here (recent form: `,
        },
        { type: "stat", value: wStat, advantage: false },
        { type: "text", value: ` vs ` },
        { type: "stat", value: lStat, advantage: true },
        {
          type: "text",
          value: ` for ${loser.lastName}) — the pick leans on other factors.`,
        },
      ],
    };
  }

  if (diff.key === "cardio") {
    if (diff.delta < 2) return null;
    if (winnerLeads) {
      return {
        kind,
        factorKey: "cardio",
        title: "Cardio",
        segments: [
          {
            type: "text",
            value: `Over the distance, ${winner.lastName} has a modest gas-tank lean (cardio: `,
          },
          { type: "stat", value: wStat, advantage: true },
          { type: "text", value: ` vs ` },
          { type: "stat", value: lStat, advantage: false },
          { type: "text", value: `).` },
        ],
      };
    }
    return {
      kind,
      factorKey: "cardio",
      title: `Weak spot — cardio`,
      segments: [
        { type: "text", value: `${loser.lastName} holds the cardio edge (` },
        { type: "stat", value: lStat, advantage: true },
        { type: "text", value: ` vs ` },
        { type: "stat", value: wStat, advantage: false },
        {
          type: "text",
          value: `) — ${winner.lastName} needs cleaner minutes early.`,
        },
      ],
    };
  }

  if (diff.key === "striking") {
    if (diff.delta <= 2) {
      return {
        kind,
        factorKey: "striking",
        title: "Striking",
        segments: [
          { type: "text", value: `Striking looks level (` },
          { type: "stat", value: wStat, advantage: false },
          { type: "text", value: ` vs ` },
          { type: "stat", value: lStat, advantage: false },
          {
            type: "text",
            value: `) — neither clearly outpaces the other on current rates.`,
          },
        ],
      };
    }
    if (winnerLeads) {
      return {
        kind,
        factorKey: "striking",
        title: "Striking",
        segments: [
          { type: "text", value: `${winner.lastName} has the striking lean (` },
          { type: "stat", value: wStat, advantage: true },
          { type: "text", value: ` vs ` },
          { type: "stat", value: lStat, advantage: false },
          { type: "text", value: `).` },
        ],
      };
    }
    return {
      kind,
      factorKey: "striking",
      title: `Weak spot — striking`,
      segments: [
        { type: "text", value: `${loser.lastName} rates higher on striking (` },
        { type: "stat", value: lStat, advantage: true },
        { type: "text", value: ` vs ` },
        { type: "stat", value: wStat, advantage: false },
        { type: "text", value: `) — a path to flip minutes if the fight stays upright.` },
      ],
    };
  }

  // reach
  if (diff.delta < 2) return null;
  if (winnerLeads) {
    return {
      kind: "reach",
      factorKey: "reach",
      title: "Reach",
      segments: [
        { type: "text", value: `${winner.lastName} owns the length (` },
        { type: "stat", value: wStat, advantage: true },
        { type: "text", value: ` vs ` },
        { type: "stat", value: lStat, advantage: false },
        { type: "text", value: `).` },
      ],
    };
  }
  return {
    kind: "reach",
    factorKey: "reach",
    title: "Reach",
    segments: [
      { type: "text", value: `${loser.lastName} has the longer reach (` },
      { type: "stat", value: lStat, advantage: true },
      { type: "text", value: ` vs ` },
      { type: "stat", value: wStat, advantage: false },
      { type: "text", value: `).` },
    ],
  };
}

function buildMethodReason(
  winner: Fighter,
  loser: Fighter,
  method: { label: string; kind: "decision" | "finish" | "other"; share: number },
  pathLabel?: string,
): EdgeReasonCard {
  const shareNote = method.share > 0 ? ` (${method.share}%)` : "";
  const path = pathLabel ?? `${winner.lastName} by ${method.label}`;

  if (method.kind === "decision") {
    return {
      kind: "method",
      factorKey: "method",
      title: "Most likely path",
      segments: [
        {
          type: "text",
          value: `Structural path mix points to `,
        },
        { type: "stat", value: path, advantage: true },
        {
          type: "text",
          value: `${shareNote} — durability and finish propensity, not “close scores ⇒ decision.”`,
        },
      ],
    };
  }

  return {
    kind: "method",
    factorKey: "method",
    title: "Most likely path",
    segments: [
      {
        type: "text",
        value: `Versus ${loser.lastName}, the highest-probability individual path is `,
      },
      { type: "stat", value: path, advantage: true },
      { type: "text", value: `${shareNote}.` },
    ],
  };
}

function buildTemporalScenarios(
  winner: Fighter,
  loser: Fighter,
  method: { label: string; kind: "decision" | "finish" | "other"; share: number },
  methods: MethodDistribution | null | undefined,
): FightScenarioCard[] {
  const decisionLean = methods?.decision ?? 0;
  const finishLean = Math.max(methods?.koTko ?? 0, methods?.submission ?? 0);
  const finishLabel =
    (methods?.koTko ?? 0) >= (methods?.submission ?? 0) ? "KO/TKO" : "Submission";

  return [
    {
      title: "Scenario A — Distance",
      body: finalizeDisplayCopy(
        method.kind === "decision" || decisionLean >= finishLean
          ? `If the fight stays upright and paced, ${winner.lastName} banks cleaner minutes round by round until the judges`
          : `If neither finds a finish early, the later rounds become a volume contest — ${winner.lastName} needs the cleaner minutes`,
      ),
      method: "decision",
      methodLabel: "Decision",
    },
    {
      title: "Scenario B — Finish window",
      body: finalizeDisplayCopy(
        `If ${loser.lastName} forces hard exchanges in rounds 1–2, a ${finishLabel} window opens — and it can cut both ways`,
      ),
      method: "finish",
      methodLabel: "Finish",
    },
  ];
}

/**
 * Build scannable Predicted Edge content: one headline, metric-backed reasons, temporal scenarios.
 * Method badge never leaks into prose fields.
 */
export function buildPredictedEdgeContent(opts: {
  winner: Fighter;
  loser: Fighter;
  shortRead: string | null;
  prediction: Prediction | null;
}): PredictedEdgeContent {
  const rawSource =
    opts.prediction?.analysis.fightscopeRead || opts.shortRead || "";
  const { methodFromText } = isolateAnalysisFields(rawSource);

  const fromMethods = dominantMethod(
    opts.prediction?.methods,
    opts.prediction?.mostLikelyPath,
  );
  const resolved = methodFromText
    ? { ...resolveMethodKind(methodFromText), share: fromMethods.share }
    : fromMethods;

  const diffs = collectMetricDiffs(opts.winner, opts.loser);
  const headline = buildHeadline(opts.winner, opts.loser, diffs);

  const reasons: EdgeReasonCard[] = [];
  for (const factor of opts.prediction?.topFactors?.slice(0, 4) ?? []) {
    if (reasons.length >= 2) break;
    const factorKey: EdgeReasonCard["factorKey"] =
      factor.factor === "reach"
        ? "reach"
        : factor.factor === "cardio"
          ? "cardio"
          : factor.factor.includes("strik")
            ? "striking"
            : "recentForm";
    reasons.push({
      kind:
        factorKey === "reach"
          ? "reach"
          : factorKey === "cardio"
            ? "cardio"
            : factorKey === "striking"
              ? "striking"
              : "form",
      factorKey,
      title: factor.label,
      segments: [
        {
          type: "text",
          value: `Structural factor “${factor.label}” contributes `,
        },
        {
          type: "stat",
          value: `${factor.magnitude > 0 ? "+" : ""}${factor.magnitude.toFixed(2)}`,
          advantage: Math.abs(factor.magnitude) >= 0.08,
        },
        {
          type: "text",
          value: ` toward ${factor.edge === "fighterA" ? "fighter A" : factor.edge === "fighterB" ? "fighter B" : "neither side"}.`,
        },
      ],
    });
  }

  if (reasons.length < 2) {
    const ranked = [...diffs].sort((a, b) => b.delta - a.delta);
    for (const diff of ranked) {
      if (reasons.length >= 2) break;
      const card = reasonFromDiff(opts.winner, opts.loser, diff);
      if (card) reasons.push(card);
    }
  }

  reasons.push(
    buildMethodReason(
      opts.winner,
      opts.loser,
      resolved,
      opts.prediction?.mostLikelyPath?.label,
    ),
  );

  const scenarios = buildTemporalScenarios(
    opts.winner,
    opts.loser,
    resolved,
    opts.prediction?.methods ?? null,
  );

  return {
    headline,
    reasons: reasons.slice(0, 3),
    methodLabel: resolved.label,
    methodKind: resolved.kind,
    scenarios,
  };
}

/** Concrete coverage gaps for tooltip — only facts derived from fighter records. */
export function dataCoverageGaps(fighterA: Fighter, fighterB: Fighter): string[] {
  const gaps: string[] = [];
  const check = (fighter: Fighter) => {
    const s = fighter.statistics;
    if (s.sigStrikesLandedPerMin == null && s.sigStrikeAccuracy == null) {
      gaps.push(`Striking rate tables incomplete for ${fighter.lastName}`);
    }
    if (s.takedownsPer15 == null && s.takedownDefense == null) {
      gaps.push(`Grappling rate tables incomplete for ${fighter.lastName}`);
    }
    if (fighter.reachCm == null) {
      gaps.push(`Reach missing for ${fighter.lastName}`);
    }
    if (fighter.recentFights.length < 3) {
      gaps.push(`Fewer than 3 recent fights logged for ${fighter.lastName}`);
    }
  };
  check(fighterA);
  check(fighterB);
  return [...new Set(gaps)].slice(0, 4);
}

/** User-facing completeness label from HIGH/MEDIUM/LOW — never the raw engine sentence. */
export function dataCompletenessLabel(
  quality: "HIGH" | "MEDIUM" | "LOW",
  reasons?: string[],
): {
  short: string;
  detail: string;
} {
  if (quality === "HIGH") {
    return {
      short: "Data coverage high",
      detail:
        reasons?.[0] ??
        "Multiple reliable fields and sufficient recent fight data support this read.",
    };
  }
  if (quality === "MEDIUM") {
    return {
      short: "Data coverage medium",
      detail:
        reasons?.[0] ??
        "Partial statistical coverage — some rates or history are thin.",
    };
  }
  return {
    short: "Data coverage limited",
    detail:
      reasons?.[0] ??
      "Limited comparable fight data — probabilities are intentionally less extreme.",
  };
}

/** @deprecated kept for any residual callers — prefer buildPredictedEdgeContent scenarios. */
export function parseScenariosCompat(text: string): FightScenarioCard[] {
  const match = text.match(/Scenarios:\s*(.+)$/i);
  const blob = match?.[1] ?? "";
  if (!blob && !text.includes("|")) return [];
  const source = match ? blob : text;
  return source
    .split(/\s*\|\s*/)
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk, index) => {
      const [head, ...rest] = chunk.split(/\s+[—–-]\s+/);
      const titleRaw = (head ?? chunk).trim();
      const body = (rest.join(" — ") || chunk).trim();
      const lower = `${titleRaw} ${body}`.toLowerCase();
      const isDecision = /decision|points|judges/.test(lower);
      const isFinish = /tko|ko|submission|finish|ground-and-pound/.test(lower);
      const methodLabel = isDecision ? "Decision" : isFinish ? "Finish" : "Path";
      return {
        title: `Scenario ${index === 0 ? "A" : "B"} — ${methodLabel}`,
        body: firstSentences(body || titleRaw, 2),
        method: (isDecision ? "decision" : isFinish ? "finish" : "other") as
          | "decision"
          | "finish"
          | "other",
        methodLabel,
      };
    });
}
