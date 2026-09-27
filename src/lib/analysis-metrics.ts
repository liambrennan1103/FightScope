import { displayValue, formatHeight, formatReach, formatRecord } from "@/lib/format";
import type { Fighter, JointOutcomeDistribution, Prediction, PredictionFactor } from "@/lib/types";

export type EdgeMagnitude = "negligible" | "slight" | "moderate" | "clear" | "strong";

export function edgeMagnitudeFromDiff(absDiff: number, scale: "pct" | "rate" | "score" | "cm"): EdgeMagnitude {
  if (scale === "cm") {
    if (absDiff < 2) return "negligible";
    if (absDiff < 5) return "slight";
    if (absDiff < 8) return "moderate";
    if (absDiff < 12) return "clear";
    return "strong";
  }
  if (scale === "score") {
    if (absDiff < 3) return "negligible";
    if (absDiff < 6) return "slight";
    if (absDiff < 10) return "moderate";
    if (absDiff < 16) return "clear";
    return "strong";
  }
  if (scale === "rate") {
    if (absDiff < 0.25) return "negligible";
    if (absDiff < 0.6) return "slight";
    if (absDiff < 1.2) return "moderate";
    if (absDiff < 2) return "clear";
    return "strong";
  }
  // pct 0–100
  if (absDiff < 3) return "negligible";
  if (absDiff < 6) return "slight";
  if (absDiff < 10) return "moderate";
  if (absDiff < 16) return "clear";
  return "strong";
}

export function edgeMagnitudeLabel(m: EdgeMagnitude): string {
  switch (m) {
    case "negligible":
      return "Minimal";
    case "slight":
      return "Slight";
    case "moderate":
      return "Moderate";
    case "clear":
      return "Clear";
    case "strong":
      return "Strong";
  }
}

export type ComparisonDomain = "physical" | "striking" | "grappling" | "finishing" | "form" | "model";

export type ComparisonRow = {
  id: string;
  domain: ComparisonDomain;
  label: string;
  left: string;
  right: string;
  leftNum: number | null;
  rightNum: number | null;
  higherIsBetter: boolean;
  edge: "fighterA" | "fighterB" | "neutral";
  magnitude: EdgeMagnitude;
  kind: "raw" | "model";
  tooltip?: string;
};

function finishRates(fighter: Fighter) {
  const wins = fighter.record.wins;
  const koCount = fighter.finishes.koTko;
  const subCount = fighter.finishes.submissions;
  if (wins <= 0 || koCount == null || subCount == null) {
    return { ko: null as number | null, sub: null as number | null, decision: null as number | null };
  }
  const ko = Math.round((koCount / wins) * 100);
  const sub = Math.round((subCount / wins) * 100);
  const decision = Math.max(0, 100 - ko - sub);
  return { ko, sub, decision };
}

function recentFormLabel(fighter: Fighter): string {
  const recent = fighter.recentFights.slice(0, 5);
  if (recent.length === 0) return "—";
  return recent.map((f) => (f.result === "W" ? "W" : f.result === "L" ? "L" : "D")).join("-");
}

function attributeScore(fighter: Fighter, key: string): number | null {
  const v = fighter.attributes[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function statNum(fighter: Fighter, key: keyof Fighter["statistics"]): number | null {
  const v = fighter.statistics[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function buildRow(opts: {
  id: string;
  domain: ComparisonDomain;
  label: string;
  left: string;
  right: string;
  leftNum: number | null;
  rightNum: number | null;
  higherIsBetter: boolean;
  kind: "raw" | "model";
  scale: "pct" | "rate" | "score" | "cm";
  tooltip?: string;
}): ComparisonRow | null {
  // Omit one-sided rate/pct rows rather than flooding the matrix with "—"
  if (opts.kind === "raw" && opts.scale !== "score" && (opts.leftNum == null || opts.rightNum == null)) {
    // Allow categorical text rows (stance) and physicals where one side may be missing
    if (opts.scale === "cm") {
      if (opts.leftNum == null && opts.rightNum == null) return null;
    } else if (opts.leftNum == null || opts.rightNum == null) {
      return null;
    }
  }
  if (opts.leftNum == null && opts.rightNum == null && opts.left === "—" && opts.right === "—") {
    return null;
  }
  let edge: ComparisonRow["edge"] = "neutral";
  let magnitude: EdgeMagnitude = "negligible";
  if (opts.leftNum != null && opts.rightNum != null) {
    const diff = opts.leftNum - opts.rightNum;
    const abs = Math.abs(diff);
    magnitude = edgeMagnitudeFromDiff(abs, opts.scale);
    if (magnitude !== "negligible") {
      const aBetter = opts.higherIsBetter ? diff > 0 : diff < 0;
      edge = aBetter ? "fighterA" : "fighterB";
    }
  }
  return { ...opts, edge, magnitude };
}

/** Build verified comparison rows. Omits rows with no data on either side. */
export function buildComparisonRows(fighterA: Fighter, fighterB: Fighter): ComparisonRow[] {
  const aFin = finishRates(fighterA);
  const bFin = finishRates(fighterB);
  const rows: Array<ComparisonRow | null> = [
    buildRow({
      id: "age",
      domain: "physical",
      label: "Age",
      left: displayValue(fighterA.age),
      right: displayValue(fighterB.age),
      leftNum: fighterA.age,
      rightNum: fighterB.age,
      higherIsBetter: false,
      kind: "raw",
      scale: "score",
      tooltip: "Age at catalog snapshot.",
    }),
    buildRow({
      id: "height",
      domain: "physical",
      label: "Height",
      left: formatHeight(fighterA.heightCm),
      right: formatHeight(fighterB.heightCm),
      leftNum: fighterA.heightCm,
      rightNum: fighterB.heightCm,
      higherIsBetter: true,
      kind: "raw",
      scale: "cm",
    }),
    buildRow({
      id: "reach",
      domain: "physical",
      label: "Reach",
      left: formatReach(fighterA.reachCm),
      right: formatReach(fighterB.reachCm),
      leftNum: fighterA.reachCm,
      rightNum: fighterB.reachCm,
      higherIsBetter: true,
      kind: "raw",
      scale: "cm",
      tooltip: "Standing reach in centimeters.",
    }),
    buildRow({
      id: "stance",
      domain: "physical",
      label: "Stance",
      left: displayValue(fighterA.stance),
      right: displayValue(fighterB.stance),
      leftNum: null,
      rightNum: null,
      higherIsBetter: true,
      kind: "raw",
      scale: "score",
    }),
    buildRow({
      id: "record",
      domain: "physical",
      label: "Record",
      left: formatRecord(fighterA.record),
      right: formatRecord(fighterB.record),
      leftNum: fighterA.record.wins - fighterA.record.losses,
      rightNum: fighterB.record.wins - fighterB.record.losses,
      higherIsBetter: true,
      kind: "raw",
      scale: "score",
    }),
    buildRow({
      id: "slpm",
      domain: "striking",
      label: "Sig. strikes / min",
      left: numOrDash(statNum(fighterA, "sigStrikesLandedPerMin")),
      right: numOrDash(statNum(fighterB, "sigStrikesLandedPerMin")),
      leftNum: statNum(fighterA, "sigStrikesLandedPerMin"),
      rightNum: statNum(fighterB, "sigStrikesLandedPerMin"),
      higherIsBetter: true,
      kind: "raw",
      scale: "rate",
      tooltip: "Significant strikes landed per minute.",
    }),
    buildRow({
      id: "strAcc",
      domain: "striking",
      label: "Strike accuracy",
      left: pctOrDash(statNum(fighterA, "sigStrikeAccuracy")),
      right: pctOrDash(statNum(fighterB, "sigStrikeAccuracy")),
      leftNum: statNum(fighterA, "sigStrikeAccuracy"),
      rightNum: statNum(fighterB, "sigStrikeAccuracy"),
      higherIsBetter: true,
      kind: "raw",
      scale: "pct",
    }),
    buildRow({
      id: "sapm",
      domain: "striking",
      label: "Strikes absorbed / min",
      left: numOrDash(statNum(fighterA, "sigStrikesAbsorbedPerMin")),
      right: numOrDash(statNum(fighterB, "sigStrikesAbsorbedPerMin")),
      leftNum: statNum(fighterA, "sigStrikesAbsorbedPerMin"),
      rightNum: statNum(fighterB, "sigStrikesAbsorbedPerMin"),
      higherIsBetter: false,
      kind: "raw",
      scale: "rate",
      tooltip: "Significant strikes absorbed per minute — lower is better.",
    }),
    buildRow({
      id: "strDef",
      domain: "striking",
      label: "Striking defense",
      left: pctOrDash(statNum(fighterA, "strikingDefense")),
      right: pctOrDash(statNum(fighterB, "strikingDefense")),
      leftNum: statNum(fighterA, "strikingDefense"),
      rightNum: statNum(fighterB, "strikingDefense"),
      higherIsBetter: true,
      kind: "raw",
      scale: "pct",
    }),
    buildRow({
      id: "kd",
      domain: "striking",
      label: "Knockdowns / 15",
      left: numOrDash(statNum(fighterA, "knockdownsPer15")),
      right: numOrDash(statNum(fighterB, "knockdownsPer15")),
      leftNum: statNum(fighterA, "knockdownsPer15"),
      rightNum: statNum(fighterB, "knockdownsPer15"),
      higherIsBetter: true,
      kind: "raw",
      scale: "rate",
    }),
    buildRow({
      id: "tdAvg",
      domain: "grappling",
      label: "Takedowns / 15",
      left: numOrDash(statNum(fighterA, "takedownsPer15")),
      right: numOrDash(statNum(fighterB, "takedownsPer15")),
      leftNum: statNum(fighterA, "takedownsPer15"),
      rightNum: statNum(fighterB, "takedownsPer15"),
      higherIsBetter: true,
      kind: "raw",
      scale: "rate",
    }),
    buildRow({
      id: "tdAcc",
      domain: "grappling",
      label: "Takedown accuracy",
      left: pctOrDash(statNum(fighterA, "takedownAccuracy")),
      right: pctOrDash(statNum(fighterB, "takedownAccuracy")),
      leftNum: statNum(fighterA, "takedownAccuracy"),
      rightNum: statNum(fighterB, "takedownAccuracy"),
      higherIsBetter: true,
      kind: "raw",
      scale: "pct",
    }),
    buildRow({
      id: "tdDef",
      domain: "grappling",
      label: "Takedown defense",
      left: pctOrDash(statNum(fighterA, "takedownDefense")),
      right: pctOrDash(statNum(fighterB, "takedownDefense")),
      leftNum: statNum(fighterA, "takedownDefense"),
      rightNum: statNum(fighterB, "takedownDefense"),
      higherIsBetter: true,
      kind: "raw",
      scale: "pct",
    }),
    buildRow({
      id: "subAtt",
      domain: "grappling",
      label: "Sub attempts / 15",
      left: numOrDash(statNum(fighterA, "submissionAttemptsPer15")),
      right: numOrDash(statNum(fighterB, "submissionAttemptsPer15")),
      leftNum: statNum(fighterA, "submissionAttemptsPer15"),
      rightNum: statNum(fighterB, "submissionAttemptsPer15"),
      higherIsBetter: true,
      kind: "raw",
      scale: "rate",
    }),
    buildRow({
      id: "koRate",
      domain: "finishing",
      label: "KO/TKO win rate",
      left: pctOrDash(aFin.ko),
      right: pctOrDash(bFin.ko),
      leftNum: aFin.ko,
      rightNum: bFin.ko,
      higherIsBetter: true,
      kind: "raw",
      scale: "pct",
      tooltip: "Share of career wins by KO/TKO (from verified finish counts).",
    }),
    buildRow({
      id: "subRate",
      domain: "finishing",
      label: "Submission win rate",
      left: pctOrDash(aFin.sub),
      right: pctOrDash(bFin.sub),
      leftNum: aFin.sub,
      rightNum: bFin.sub,
      higherIsBetter: true,
      kind: "raw",
      scale: "pct",
    }),
    buildRow({
      id: "decRate",
      domain: "finishing",
      label: "Decision win rate",
      left: pctOrDash(aFin.decision),
      right: pctOrDash(bFin.decision),
      leftNum: aFin.decision,
      rightNum: bFin.decision,
      higherIsBetter: true,
      kind: "raw",
      scale: "pct",
    }),
    buildRow({
      id: "form",
      domain: "form",
      label: "Recent form",
      left: recentFormLabel(fighterA),
      right: recentFormLabel(fighterB),
      leftNum: attributeScore(fighterA, "recentForm"),
      rightNum: attributeScore(fighterB, "recentForm"),
      higherIsBetter: true,
      kind: "raw",
      scale: "score",
      tooltip: "Last fights W/L/D sequence from catalog history.",
    }),
    // FightScope model attribute scores — explicitly labeled as model scores
    ...(["striking", "grappling", "wrestling", "cardio", "defense"] as const).map((key) =>
      buildRow({
        id: `model-${key}`,
        domain: "model",
        label: `FightScope ${key} score`,
        left: scoreOrDash(attributeScore(fighterA, key)),
        right: scoreOrDash(attributeScore(fighterB, key)),
        leftNum: attributeScore(fighterA, key),
        rightNum: attributeScore(fighterB, key),
        higherIsBetter: true,
        kind: "model",
        scale: "score",
        tooltip: "FightScope normalized 0–100 model score — not an official UFC percentage.",
      }),
    ),
  ];

  return rows.filter((r): r is ComparisonRow => r != null);
}

function numOrDash(n: number | null, digits = 2): string {
  if (n == null) return "—";
  return n.toFixed(digits);
}

function pctOrDash(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n)}%`;
}

function scoreOrDash(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n)} / 100`;
}

export function groupRowsByDomain(rows: ComparisonRow[]): Array<{
  domain: ComparisonDomain;
  title: string;
  rows: ComparisonRow[];
}> {
  const order: ComparisonDomain[] = ["physical", "striking", "grappling", "finishing", "form", "model"];
  const titles: Record<ComparisonDomain, string> = {
    physical: "Physical",
    striking: "Striking",
    grappling: "Grappling",
    finishing: "Finishing",
    form: "Form",
    model: "FightScope model scores",
  };
  return order
    .map((domain) => ({
      domain,
      title: titles[domain],
      rows: rows.filter((r) => r.domain === domain),
    }))
    .filter((g) => g.rows.length > 0);
}

export function methodSharesFromJoint(
  joint: JointOutcomeDistribution | undefined,
  methods: Prediction["methods"] | null | undefined,
): {
  a: { koTko: number; submission: number; decision: number };
  b: { koTko: number; submission: number; decision: number };
  draw: number;
  finishPct: number;
  decisionPct: number;
} | null {
  if (joint) {
    const finishPct = joint.aKoTko + joint.aSubmission + joint.bKoTko + joint.bSubmission;
    const decisionPct = joint.aDecision + joint.bDecision;
    return {
      a: { koTko: joint.aKoTko, submission: joint.aSubmission, decision: joint.aDecision },
      b: { koTko: joint.bKoTko, submission: joint.bSubmission, decision: joint.bDecision },
      draw: joint.draw,
      finishPct,
      decisionPct,
    };
  }
  if (!methods) return null;
  // Aggregate only — cannot split by fighter without joint outcomes
  return null;
}

export function selectTopWhyFactors(
  prediction: Prediction | null,
  limit = 3,
): PredictionFactor[] {
  if (!prediction?.topFactors?.length) return [];
  return [...prediction.topFactors]
    .filter((f) => f.edge !== "neutral" && Math.abs(f.magnitude) > 0)
    .sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude))
    .slice(0, limit);
}

/** Map model factor keys → comparison row ids to prioritize in default view. */
const FACTOR_TO_METRIC_IDS: Record<string, string[]> = {
  reach: ["reach", "height"],
  age: ["age"],
  experience: ["record"],
  recent_form: ["form"],
  form5: ["form"],
  win_rate: ["record"],
  striking_output: ["slpm", "strAcc", "kd"],
  striking_defense: ["strDef", "sapm"],
  strike_absorption: ["sapm", "strDef"],
  takedowns: ["tdAvg", "tdAcc"],
  takedown_defense: ["tdDef", "tdAvg"],
  submission_threat: ["subAtt", "subRate"],
  ko_threat: ["koRate", "kd"],
};

const DOMAIN_DEFAULTS: Record<ComparisonDomain, string[]> = {
  physical: ["reach", "height", "age", "stance"],
  striking: ["slpm", "strAcc", "strDef"],
  grappling: ["tdAvg", "tdAcc", "tdDef", "subAtt"],
  finishing: ["koRate", "subRate", "decRate"],
  form: ["form"],
  model: [],
};

/**
 * Choose which metric rows to show by default for a domain,
 * biased by model top factors when available.
 */
export function pickDefaultMetricRows(
  domain: ComparisonDomain,
  rows: ComparisonRow[],
  topFactorKeys: string[],
  max = 3,
): ComparisonRow[] {
  if (rows.length === 0) return [];
  if (domain === "model") return [];

  const preferred = new Set<string>();
  for (const key of topFactorKeys) {
    for (const id of FACTOR_TO_METRIC_IDS[key] ?? []) preferred.add(id);
  }
  for (const id of DOMAIN_DEFAULTS[domain]) preferred.add(id);

  const ranked = [...rows].sort((a, b) => {
    const ap = preferred.has(a.id) ? 1 : 0;
    const bp = preferred.has(b.id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    const am = a.magnitude === "strong" || a.magnitude === "clear" ? 1 : 0;
    const bm = b.magnitude === "strong" || b.magnitude === "clear" ? 1 : 0;
    return bm - am;
  });

  const limit = domain === "physical" ? Math.min(4, max + 1) : max;
  return ranked.slice(0, Math.min(limit, ranked.length));
}

const MAG_WEIGHT: Record<EdgeMagnitude, number> = {
  negligible: 0,
  slight: 1,
  moderate: 2,
  clear: 3,
  strong: 4,
};

export type DomainVerdict = {
  edge: "fighterA" | "fighterB" | "neutral";
  magnitude: EdgeMagnitude;
  /** e.g. "Martinez · Moderate edge" or "Even" */
  summary: string;
};

/**
 * Reproducible category verdict from comparison rows (and optional model scores).
 * Tiny differences stay Neutral / Slight — never inflated to Strong.
 */
export function domainVerdict(
  rows: ComparisonRow[],
  fighterA: Fighter,
  fighterB: Fighter,
): DomainVerdict {
  let scoreA = 0;
  let scoreB = 0;
  let weightSum = 0;

  for (const row of rows) {
    if (row.edge === "neutral" || row.magnitude === "negligible") continue;
    const w = MAG_WEIGHT[row.magnitude];
    // Model scores count slightly less so raw evidence leads the verdict
    const scale = row.kind === "model" ? 0.85 : 1;
    weightSum += w * scale;
    if (row.edge === "fighterA") scoreA += w * scale;
    else scoreB += w * scale;
  }

  if (weightSum <= 0 || Math.abs(scoreA - scoreB) < 0.75) {
    return { edge: "neutral", magnitude: "negligible", summary: "Even" };
  }

  const edge = scoreA > scoreB ? "fighterA" : "fighterB";
  const leader = edge === "fighterA" ? fighterA : fighterB;
  const delta = Math.abs(scoreA - scoreB);
  // Average edge strength, capped by how decisive the domain is overall
  const avg = delta / Math.max(1, rows.filter((r) => r.magnitude !== "negligible").length);
  let magnitude: EdgeMagnitude = "slight";
  if (avg >= 3.2 && delta >= 5) magnitude = "strong";
  else if (avg >= 2.4 && delta >= 3.5) magnitude = "clear";
  else if (avg >= 1.6 && delta >= 2) magnitude = "moderate";
  else magnitude = "slight";

  return {
    edge,
    magnitude,
    summary: `${leader.lastName} · ${edgeMagnitudeLabel(magnitude)} edge`,
  };
}

/** Components that feed each FightScope attribute score (from deriveAttributes). */
export const MODEL_SCORE_COMPONENTS: Record<string, string[]> = {
  striking: ["striking output", "accuracy", "striking defense"],
  grappling: ["submission share", "submission attempts", "advances / reversals"],
  wrestling: ["takedowns/15", "takedown accuracy", "takedown defense"],
  cardio: ["recent form", "five-round experience", "age profile"],
  defense: ["striking defense", "absorption", "takedown defense"],
};

export function modelScoreTooltip(scoreKey: string): string {
  const parts = MODEL_SCORE_COMPONENTS[scoreKey];
  const base =
    "Composite FightScope score derived from verified statistics and normalized within the prediction model.";
  if (!parts?.length) return base;
  return `${base} Built primarily from: ${parts.join(", ")}.`;
}

export function impactLabelFromMagnitude(magnitude: number): EdgeMagnitude {
  const abs = Math.abs(magnitude);
  // Engine magnitudes are contribution weights — keep language conservative
  if (abs < 0.05) return "negligible";
  if (abs < 0.1) return "slight";
  if (abs < 0.18) return "moderate";
  if (abs < 0.3) return "clear";
  return "strong";
}

export type CoverageChecklistItem = {
  label: string;
  status: "ok" | "partial" | "missing";
};

export function buildCoverageChecklist(
  fighterA: Fighter,
  fighterB: Fighter,
): CoverageChecklistItem[] {
  const has = (fn: (f: Fighter) => boolean) => fn(fighterA) && fn(fighterB);
  const partial = (fn: (f: Fighter) => boolean) => fn(fighterA) || fn(fighterB);
  return [
    {
      label: "Official profile data",
      status: has((f) => Boolean(f.name && f.record)) ? "ok" : "missing",
    },
    {
      label: "Recent fight history",
      status: has((f) => f.recentFights.length >= 3)
        ? "ok"
        : partial((f) => f.recentFights.length > 0)
          ? "partial"
          : "missing",
    },
    {
      label: "Detailed striking data",
      status: has((f) => f.statistics.sigStrikesLandedPerMin != null)
        ? "ok"
        : partial((f) => f.statistics.sigStrikesLandedPerMin != null)
          ? "partial"
          : "missing",
    },
    {
      label: "Detailed grappling data",
      status: has((f) => f.statistics.takedownDefense != null)
        ? "ok"
        : partial((f) => f.statistics.takedownDefense != null)
          ? "partial"
          : "missing",
    },
    {
      label: "Reach & physicals",
      status: has((f) => f.reachCm != null && f.heightCm != null)
        ? "ok"
        : partial((f) => f.reachCm != null || f.heightCm != null)
          ? "partial"
          : "missing",
    },
  ];
}
