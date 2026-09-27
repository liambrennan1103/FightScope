import type { MatchupFeatures } from "@/server/prediction/features";
import {
  getLiveBaseRates,
  selectBaseRate,
  type StratifiedBaseRates,
} from "@/server/prediction/base-rates";
import type { JointOutcomes, StructuredFactor } from "@/server/prediction/types";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function sigmoid(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

function softMax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

function nz(value: number | null | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

/**
 * Relative strength toward fighter A (positive = A favored).
 * Separated from absolute finish propensity.
 */
export function winnerLogit(features: MatchupFeatures): {
  logit: number;
  factors: StructuredFactor[];
} {
  const { a, b, rounds, isTitle } = features;
  const factors: StructuredFactor[] = [];

  const push = (factor: string, label: string, delta: number, scale: number) => {
    const magnitude = delta * scale;
    if (Math.abs(magnitude) < 0.01) return;
    factors.push({
      factor,
      label,
      edge: magnitude > 0 ? "fighterA" : magnitude < 0 ? "fighterB" : "neutral",
      magnitude,
    });
  };

  let logit = 0;

  const formDelta = a.form3 - b.form3;
  logit += formDelta * 1.35;
  push("recent_form", "Recent form", formDelta, 1.35);

  const form5Delta = a.form5 - b.form5;
  logit += form5Delta * 0.55;
  push("form5", "Last-5 form", form5Delta, 0.55);

  const wrDelta = a.winRate - b.winRate;
  logit += wrDelta * 0.9;
  push("win_rate", "Win rate", wrDelta, 0.9);

  const expDelta =
    Math.log1p(a.experienceBouts) - Math.log1p(b.experienceBouts);
  logit += expDelta * 0.35;
  push("experience", "Experience", expDelta, 0.35);

  const reachDelta =
    a.reachCm != null && b.reachCm != null ? (a.reachCm - b.reachCm) / 10 : 0;
  logit += reachDelta * 0.22;
  push("reach", "Reach", reachDelta, 0.22);

  const ageDelta =
    a.age != null && b.age != null ? (b.age - a.age) / 8 : 0; // younger positive for A
  logit += ageDelta * 0.28;
  push("age", "Age", ageDelta, 0.28);

  const slpmDelta = (nz(a.slpm, 3.5) - nz(b.slpm, 3.5)) / 2.5;
  logit += slpmDelta * 0.45;
  push("striking_output", "Striking output", slpmDelta, 0.45);

  const strDefDelta = (nz(a.strDef, 50) - nz(b.strDef, 50)) / 20;
  logit += strDefDelta * 0.4;
  push("striking_defense", "Striking defense", strDefDelta, 0.4);

  const sapmDelta = (nz(b.sapm, 3.5) - nz(a.sapm, 3.5)) / 2.5; // lower absorbed better
  logit += sapmDelta * 0.25;
  push("strike_absorption", "Strike absorption", sapmDelta, 0.25);

  const tdDelta = (nz(a.tdPer15, 1) - nz(b.tdPer15, 1)) / 2;
  logit += tdDelta * 0.3;
  push("takedowns", "Takedown output", tdDelta, 0.3);

  const tdDefDelta = (nz(a.tdDef, 60) - nz(b.tdDef, 60)) / 25;
  logit += tdDefDelta * 0.35;
  push("takedown_defense", "Takedown defense", tdDefDelta, 0.35);

  const subThreatDelta = a.subWinRate + nz(a.subPer15, 0) / 2 - (b.subWinRate + nz(b.subPer15, 0) / 2);
  logit += subThreatDelta * 0.35;
  push("submission_threat", "Submission threat", subThreatDelta, 0.35);

  const koThreatDelta = a.koWinRate + nz(a.kdPer15, 0) / 2 - (b.koWinRate + nz(b.kdPer15, 0) / 2);
  logit += koThreatDelta * 0.4;
  push("ko_threat", "KO threat", koThreatDelta, 0.4);

  // Interaction features (matchup-dependent)
  const strikeIx = features.interactions.aStrikeVsBDef;
  logit += strikeIx * 0.55;
  push("strike_interaction", "Strike vs defense matchup", strikeIx, 0.55);

  const koIx = features.interactions.aKoThreatVsB - features.interactions.bKoThreatVsA;
  logit += koIx * 0.4;
  push("ko_interaction", "KO threat vs vulnerability", koIx, 0.4);

  const tdIx = features.interactions.aTdVsBDef - features.interactions.bTdVsADef;
  logit += tdIx * 0.35;
  push("td_interaction", "Takedown vs defense matchup", tdIx, 0.35);

  const subIx = features.interactions.aSubVsB - features.interactions.bSubVsA;
  logit += subIx * 0.35;
  push("sub_interaction", "Submission matchup", subIx, 0.35);

  const rankDelta = a.rankScore - b.rankScore;
  logit += rankDelta * 0.55;
  push("ranking", "Ranking", rankDelta, 0.55);

  if (rounds === 5) {
    const cardioProxy =
      (a.fiveRoundExp - b.fiveRoundExp) / 5 +
      (a.decisionWinShare - b.decisionWinShare) * 0.4;
    logit += cardioProxy * 0.35;
    push("cardio", "Five-round durability", cardioProxy, 0.35);
  }

  if (isTitle) {
    const titleDelta = (a.titleExp - b.titleExp) / 4;
    logit += titleDelta * 0.25;
    push("title_exp", "Title experience", titleDelta, 0.25);
  }

  // Southpaw open-stance bump when striking-forward
  if (a.stanceSouthpaw && !b.stanceSouthpaw) {
    logit += 0.12 * Math.max(0, nz(a.slpm, 3.5) - 3);
  }
  if (b.stanceSouthpaw && !a.stanceSouthpaw) {
    logit -= 0.12 * Math.max(0, nz(b.slpm, 3.5) - 3);
  }

  factors.sort((x, y) => Math.abs(y.magnitude) - Math.abs(x.magnitude));
  return { logit, factors: factors.slice(0, 8) };
}

/**
 * Absolute finish propensities + interaction (offense × vulnerability).
 * Independent of who is "better" on relative scores.
 */
export function finishScores(features: MatchupFeatures): {
  koA: number;
  koB: number;
  subA: number;
  subB: number;
  decisionPull: number;
} {
  const { a, b } = features;

  const koOffenseA = a.koWinRate * 1.4 + nz(a.kdPer15, 0) * 0.55 + nz(a.slpm, 3.5) * 0.08;
  const koOffenseB = b.koWinRate * 1.4 + nz(b.kdPer15, 0) * 0.55 + nz(b.slpm, 3.5) * 0.08;
  const koVulnA = a.koLossRate * 1.2 + nz(a.sapm, 3.5) * 0.1 + (1 - nz(a.strDef, 50) / 100) * 0.8;
  const koVulnB = b.koLossRate * 1.2 + nz(b.sapm, 3.5) * 0.1 + (1 - nz(b.strDef, 50) / 100) * 0.8;

  const subOffenseA = a.subWinRate * 1.6 + nz(a.subPer15, 0) * 0.7 + nz(a.tdPer15, 1) * 0.15;
  const subOffenseB = b.subWinRate * 1.6 + nz(b.subPer15, 0) * 0.7 + nz(b.tdPer15, 1) * 0.15;
  const subVulnA = a.subLossRate * 1.4 + (1 - nz(a.tdDef, 60) / 100) * 0.9;
  const subVulnB = b.subLossRate * 1.4 + (1 - nz(b.tdDef, 60) / 100) * 0.9;

  // Interaction: offense × opponent vulnerability (tempered — not a KO hammer)
  const koA = koOffenseA * (0.45 + 0.75 * koVulnB);
  const koB = koOffenseB * (0.45 + 0.75 * koVulnA);
  const subA = subOffenseA * (0.45 + 0.75 * subVulnB);
  const subB = subOffenseB * (0.45 + 0.75 * subVulnA);

  // Decision pull from absolute durability + low finish rates — NOT a fallback.
  // Kept as an absolute channel only; relative finish similarity must not force Decision.
  const decisionPull =
    (a.decisionWinShare + b.decisionWinShare) * 0.85 +
    (1 - (a.finishRate + b.finishRate) / 2) * 0.7 +
    (1 - (a.beenFinishedRate + b.beenFinishedRate) / 2) * 0.35 +
    0.35;

  return { koA, koB, subA, subB, decisionPull };
}

export type RawJoint = {
  probs: number[]; // length 7: Ako, Asub, Adec, Bko, Bsub, Bdec, draw
  factors: StructuredFactor[];
  winnerLogit: number;
};

/**
 * Joint outcome logits → softmax probabilities.
 * Indices: 0 A_KO, 1 A_SUB, 2 A_DEC, 3 B_KO, 4 B_SUB, 5 B_DEC, 6 DRAW
 */
export function scoreJointOutcomes(
  features: MatchupFeatures,
  baseRates?: StratifiedBaseRates,
  temperature = 1,
  /** Optional override for winner logit (ensemble). */
  winnerLogitOverride?: number,
): RawJoint {
  const rates = selectBaseRate(
    baseRates ?? getLiveBaseRates(),
    features.rounds,
    features.isWomens,
  );
  const { logit: rawLogit, factors } = winnerLogit(features);
  const logit = winnerLogitOverride ?? rawLogit;
  const fin = finishScores(features);

  const priorKo = Math.log(rates.koTko + 1e-6);
  const priorSub = Math.log(rates.submission + 1e-6);
  const priorDec = Math.log(rates.decision + 1e-6);

  // Winner strength shared across a fighter's three methods.
  // Equal win-channel weights — Decision must not get an artificial boost.
  // Absolute finish propensity + empirical base rates drive method mix.
  const winA = logit;
  const winB = -logit;

  const logits = [
    winA * 0.85 + fin.koA * 1.0 + priorKo * 1.0,
    winA * 0.85 + fin.subA * 1.0 + priorSub * 1.0,
    winA * 0.85 + fin.decisionPull * 0.9 + priorDec * 1.0,
    winB * 0.85 + fin.koB * 1.0 + priorKo * 1.0,
    winB * 0.85 + fin.subB * 1.0 + priorSub * 1.0,
    winB * 0.85 + fin.decisionPull * 0.9 + priorDec * 1.0,
    -2.4,
  ];

  const scaled = logits.map((l) => l / Math.max(0.35, temperature));
  const probs = softMax(scaled);
  return { probs, factors, winnerLogit: logit };
}

export function jointFromProbs(probs: number[]): JointOutcomes {
  const pcts = probs.map((p) => p * 100);
  // Largest remainder so integers sum to 100
  const floors = pcts.map((p) => Math.floor(p));
  let rem = 100 - floors.reduce((a, b) => a + b, 0);
  const order = pcts
    .map((p, i) => ({ i, frac: p - Math.floor(p) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < rem; k += 1) {
    floors[order[k % order.length]!.i] += 1;
  }
  return {
    aKoTko: floors[0]!,
    aSubmission: floors[1]!,
    aDecision: floors[2]!,
    bKoTko: floors[3]!,
    bSubmission: floors[4]!,
    bDecision: floors[5]!,
    draw: floors[6]!,
  };
}

export function deriveWinnerMethods(joint: JointOutcomes): {
  fighterAWinPct: number;
  fighterBWinPct: number;
  drawPct: number;
  methods: { koTko: number; submission: number; decision: number };
} {
  const fighterAWinPct = joint.aKoTko + joint.aSubmission + joint.aDecision;
  const fighterBWinPct = joint.bKoTko + joint.bSubmission + joint.bDecision;
  const drawPct = joint.draw;
  const methods = {
    koTko: joint.aKoTko + joint.bKoTko,
    submission: joint.aSubmission + joint.bSubmission,
    decision: joint.aDecision + joint.bDecision,
  };
  // Do NOT fold draw into Decision — that reintroduces Decision bias in the UI.
  // Methods are shares of the fight excluding draw; renormalize to 100 when draw > 0.
  const methodSum = methods.koTko + methods.submission + methods.decision;
  if (methodSum > 0 && methodSum !== 100) {
    const scale = 100 / methodSum;
    methods.koTko = Math.round(methods.koTko * scale);
    methods.submission = Math.round(methods.submission * scale);
    methods.decision = Math.max(0, 100 - methods.koTko - methods.submission);
  }
  return { fighterAWinPct, fighterBWinPct, drawPct, methods };
}

export function mostLikelyPath(joint: JointOutcomes): {
  side: "A" | "B" | "draw";
  method: "koTko" | "submission" | "decision" | "draw";
  label: string;
  pct: number;
} {
  const entries: Array<{
    side: "A" | "B" | "draw";
    method: "koTko" | "submission" | "decision" | "draw";
    label: string;
    pct: number;
  }> = [
    { side: "A", method: "koTko", label: "A by KO/TKO", pct: joint.aKoTko },
    { side: "A", method: "submission", label: "A by Submission", pct: joint.aSubmission },
    { side: "A", method: "decision", label: "A by Decision", pct: joint.aDecision },
    { side: "B", method: "koTko", label: "B by KO/TKO", pct: joint.bKoTko },
    { side: "B", method: "submission", label: "B by Submission", pct: joint.bSubmission },
    { side: "B", method: "decision", label: "B by Decision", pct: joint.bDecision },
    { side: "draw", method: "draw", label: "Draw", pct: joint.draw },
  ];
  entries.sort((a, b) => b.pct - a.pct);
  return entries[0]!;
}

export function applyTemperature(probs: number[], temperature: number): number[] {
  const logits = probs.map((p) => Math.log(Math.max(p, 1e-9)));
  return softMax(logits.map((l) => l / Math.max(0.35, temperature)));
}

export { clamp, sigmoid };
