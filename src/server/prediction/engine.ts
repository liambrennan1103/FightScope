import type { Confidence, Fighter, Prediction } from "@/lib/types";
import { fighterAsOf } from "@/server/prediction/as-of";
import { loadModelArtifact } from "@/server/prediction/artifacts";
import { getCalibration, setCalibration } from "@/server/prediction/calibrate";
import { coverageFromFeatures, shrinkJointProbs } from "@/server/prediction/coverage";
import { buildMatchupFeatures } from "@/server/prediction/features";
import {
  getLiveBaseRates,
  selectBaseRate,
  setLiveBaseRates,
} from "@/server/prediction/base-rates";
import { eloLogit, ELO_DEFAULT, type EloTable } from "@/server/prediction/elo";
import {
  eloToPA,
  ensembleWinner,
  formToPA,
} from "@/server/prediction/ensemble";
import {
  deriveWinnerMethods,
  jointFromProbs,
  mostLikelyPath,
  scoreJointOutcomes,
  sigmoid,
  winnerLogit,
} from "@/server/prediction/joint-model";
import { applyPlatt, IDENTITY_PLATT, type PlattParams } from "@/server/prediction/platt";
import {
  combineReliability,
  sampleSizeReliability,
  shrinkByReliability,
  shrinkJointByReliability,
} from "@/server/prediction/reliability";
import { activeSources } from "@/server/prediction/sources/registry";
import type { EnginePrediction, MatchupContextV3, ProvenanceRecord } from "@/server/prediction/types";
import {
  PREDICTION_CALIBRATION_VERSION,
  PREDICTION_DATA_SNAPSHOT_VERSION,
  PREDICTION_FEATURE_VERSION,
  PREDICTION_METHOD_MODEL_VERSION,
  PREDICTION_MODEL_VERSION,
} from "@/server/prediction/versions";

let LIVE_PLATT: PlattParams = { ...IDENTITY_PLATT };
let LIVE_ELO: EloTable | null = null;
let ARTIFACTS_LOADED = false;

/** Load persisted calibration/base-rates/Platt once (production boot). */
export function ensurePredictionArtifactsLoaded(): void {
  if (ARTIFACTS_LOADED) return;
  ARTIFACTS_LOADED = true;
  const artifact = loadModelArtifact();
  if (!artifact) return;
  setCalibration(artifact.calibration);
  setLiveBaseRates(artifact.baseRates);
  LIVE_PLATT = artifact.platt ?? { ...IDENTITY_PLATT };
}

export function setLivePlatt(params: PlattParams): void {
  LIVE_PLATT = params;
}

export function setLiveEloTable(table: EloTable | null): void {
  LIVE_ELO = table;
}

function confidenceFromGap(gap: number, reliability: number): Confidence {
  const adjGap = gap * (0.55 + 0.45 * reliability);
  if (adjGap >= 18) return "High";
  if (adjGap >= 9) return "Medium";
  return "Low";
}

function buildProvenance(fighterA: Fighter, fighterB: Fighter): ProvenanceRecord[] {
  const now = new Date().toISOString();
  const src = activeSources()[0]?.id ?? "espn-ufc";
  const rows: ProvenanceRecord[] = [];
  for (const [label, f] of [
    ["A", fighterA],
    ["B", fighterB],
  ] as const) {
    rows.push({
      field: `${label}.record`,
      value: `${f.record.wins}-${f.record.losses}-${f.record.draws}`,
      source: src,
      sourceType: "catalog",
      sourceWeight: 1,
      retrievedAt: now,
    });
    rows.push({
      field: `${label}.reachCm`,
      value: f.reachCm,
      source: src,
      sourceType: "catalog",
      sourceWeight: 1,
      retrievedAt: now,
    });
  }
  return rows;
}

/**
 * Structural prediction — NO Anthropic calls.
 * Pipeline: features → ensemble (Elo/matchup/form) → joint → coverage shrink
 * → Platt (winner) → reliability shrink → integer joint.
 */
export function predictFightStructural(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContextV3 = { rounds: 3, isTitle: false, division: null },
  opts: {
    leakOutcome?: {
      winnerId: string | null;
      method: string | null;
      fighterAId: string;
      fighterBId: string;
    };
    eloTable?: EloTable | null;
  } = {},
): EnginePrediction {
  ensurePredictionArtifactsLoaded();

  const asOf = context.asOf ?? new Date().toISOString();
  const a = context.asOf
    ? fighterAsOf(fighterA, asOf, { leakOutcome: opts.leakOutcome })
    : fighterA;
  const b = context.asOf
    ? fighterAsOf(fighterB, asOf, { leakOutcome: opts.leakOutcome })
    : fighterB;

  const features = buildMatchupFeatures(a, b, { ...context, asOf: context.asOf });
  const coverage = coverageFromFeatures(features);
  const cal = getCalibration();
  const baseRates = getLiveBaseRates();
  const selectedBase = selectBaseRate(baseRates, features.rounds, features.isWomens);

  // --- Submodels ---
  const matchup = winnerLogit(features);
  const matchupPA = sigmoid(matchup.logit);

  const eloTable = opts.eloTable ?? LIVE_ELO;
  const eloA = eloTable?.get(a.id) ?? ELO_DEFAULT;
  const eloB = eloTable?.get(b.id) ?? ELO_DEFAULT;
  const strengthPA = eloToPA(eloLogit(eloA, eloB));

  const formPA = formToPA(features.a.form3, features.b.form3);

  const ensemble = ensembleWinner([
    { name: "strength", pA: strengthPA },
    { name: "matchup", pA: matchupPA },
    { name: "form", pA: formPA },
  ]);

  const reliability = combineReliability({
    dataCompleteness: coverage.score,
    sampleSize: sampleSizeReliability(features.a.experienceBouts, features.b.experienceBouts),
    opponentQuality: Math.min(1, (eloA + eloB) / (2 * 1700)),
    modelAgreement: ensemble.agreement,
    dataFreshness: features.asOf ? 0.75 : 0.9,
  });

  // Joint outcomes using ensemble winner logit (not raw matchup-only)
  const raw = scoreJointOutcomes(features, baseRates, cal.temperature, ensemble.logit);
  let probs = shrinkJointProbs(
    raw.probs,
    coverage.score,
    selectedBase,
    cal.shrinkStrength,
  );

  // Reliability shrink toward neutral prior
  const prior = [
    0.5 * selectedBase.koTko * 0.985,
    0.5 * selectedBase.submission * 0.985,
    0.5 * selectedBase.decision * 0.985,
    0.5 * selectedBase.koTko * 0.985,
    0.5 * selectedBase.submission * 0.985,
    0.5 * selectedBase.decision * 0.985,
    0.015,
  ];
  probs = shrinkJointByReliability(probs, reliability.overall, prior, 0.4);

  // Derive winner P(A), apply Platt + reliability on binary margin, then re-scale joints
  const aWin = probs[0]! + probs[1]! + probs[2]!;
  const bWin = probs[3]! + probs[4]! + probs[5]!;
  const draw = probs[6]!;
  const nonDraw = aWin + bWin || 1;
  let pA = aWin / nonDraw;
  const rawPA = pA;
  pA = applyPlatt(pA, LIVE_PLATT);
  const calibratedPA = pA;
  pA = shrinkByReliability(pA, reliability.overall, 0.4);
  const reliabilityAdjustedPA = pA;

  // Re-allocate non-draw mass using calibrated P(A)
  const newA = pA * nonDraw;
  const newB = (1 - pA) * nonDraw;
  const scaleA = aWin > 0 ? newA / aWin : 0;
  const scaleB = bWin > 0 ? newB / bWin : 0;
  probs = [
    probs[0]! * scaleA,
    probs[1]! * scaleA,
    probs[2]! * scaleA,
    probs[3]! * scaleB,
    probs[4]! * scaleB,
    probs[5]! * scaleB,
    draw,
  ];
  const sum = probs.reduce((s, p) => s + p, 0) || 1;
  probs = probs.map((p) => p / sum);

  const joint = jointFromProbs(probs);
  const derived = deriveWinnerMethods(joint);
  const path = mostLikelyPath(joint);
  const gap = Math.abs(derived.fighterAWinPct - derived.fighterBWinPct);

  const pathLabel =
    path.side === "draw"
      ? "Draw"
      : path.side === "A"
        ? `${a.lastName} by ${path.method === "koTko" ? "KO/TKO" : path.method === "submission" ? "Submission" : "Decision"}`
        : `${b.lastName} by ${path.method === "koTko" ? "KO/TKO" : path.method === "submission" ? "Submission" : "Decision"}`;

  const predictedWinnerSide: "A" | "B" | "draw" =
    derived.drawPct >= derived.fighterAWinPct && derived.drawPct >= derived.fighterBWinPct
      ? "draw"
      : derived.fighterAWinPct >= derived.fighterBWinPct
        ? "A"
        : "B";

  // Prefer ensemble/matchup factors for explanations
  const topFactors = matchup.factors;

  return {
    modelVersion: PREDICTION_MODEL_VERSION,
    featureVersion: PREDICTION_FEATURE_VERSION,
    dataSnapshotVersion: PREDICTION_DATA_SNAPSHOT_VERSION,
    calibrationVersion: PREDICTION_CALIBRATION_VERSION,
    methodModelVersion: PREDICTION_METHOD_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    winner: {
      fighterAWinPct: derived.fighterAWinPct,
      fighterBWinPct: derived.fighterBWinPct,
      drawPct: derived.drawPct,
    },
    methods: derived.methods,
    joint,
    predictedWinnerSide,
    mostLikelyPath: { ...path, label: pathLabel },
    confidence: confidenceFromGap(gap, reliability.overall),
    coverage: {
      level: coverage.level,
      score: Number(coverage.score.toFixed(3)),
      reasons: coverage.reasons,
    },
    reliability: {
      overall: Number(reliability.overall.toFixed(3)),
      sampleSize: Number(reliability.sampleSize.toFixed(3)),
      modelAgreement: Number(reliability.modelAgreement.toFixed(3)),
      dataCompleteness: Number(reliability.dataCompleteness.toFixed(3)),
    },
    modelAgreement: Number(ensemble.agreement.toFixed(3)),
    diagnostics: {
      rawPA: Number(rawPA.toFixed(4)),
      calibratedPA: Number(calibratedPA.toFixed(4)),
      reliabilityAdjustedPA: Number(reliabilityAdjustedPA.toFixed(4)),
      strengthPA: Number(strengthPA.toFixed(4)),
      matchupPA: Number(matchupPA.toFixed(4)),
      formPA: Number(formPA.toFixed(4)),
    },
    topFactors,
    provenance: buildProvenance(a, b),
  };
}

/** Convert engine output into the existing Prediction UI/API shape. */
export function toLegacyPrediction(
  engine: EnginePrediction,
  fighterA: Fighter,
  fighterB: Fighter,
): Prediction {
  const predictedWinnerId =
    engine.predictedWinnerSide === "A"
      ? fighterA.id
      : engine.predictedWinnerSide === "B"
        ? fighterB.id
        : engine.winner.fighterAWinPct >= engine.winner.fighterBWinPct
          ? fighterA.id
          : fighterB.id;

  const factorLabels = (side: "fighterA" | "fighterB") =>
    engine.topFactors
      .filter((f) => f.edge === side)
      .slice(0, 3)
      .map((f) => f.label);

  const pick = predictedWinnerId === fighterA.id ? fighterA : fighterB;
  const pickPct =
    predictedWinnerId === fighterA.id
      ? engine.winner.fighterAWinPct
      : engine.winner.fighterBWinPct;

  return {
    fighterAWinPct: engine.winner.fighterAWinPct,
    fighterBWinPct: engine.winner.fighterBWinPct,
    predictedWinnerId,
    confidence: engine.confidence,
    methods: engine.methods,
    jointOutcomes: engine.joint,
    topFactors: engine.topFactors.map((f) => ({
      factor: f.factor,
      label: f.label,
      edge: f.edge,
      magnitude: f.magnitude,
    })),
    mostLikelyPath: {
      label: engine.mostLikelyPath.label,
      pct: engine.mostLikelyPath.pct,
      method: engine.mostLikelyPath.method,
    },
    modelVersion: engine.modelVersion,
    featureVersion: engine.featureVersion,
    coverageScore: engine.coverage.score,
    coverageLevel: engine.coverage.level,
    coverageReasons: engine.coverage.reasons,
    keyAdvantages: {
      fighterA: factorLabels("fighterA"),
      fighterB: factorLabels("fighterB"),
    },
    analysis: {
      howAWins: `${fighterA.lastName} wins most often via the structural path mix (KO ${engine.joint.aKoTko}% / SUB ${engine.joint.aSubmission}% / DEC ${engine.joint.aDecision}%).`,
      howBWins: `${fighterB.lastName} wins most often via KO ${engine.joint.bKoTko}% / SUB ${engine.joint.bSubmission}% / DEC ${engine.joint.bDecision}%.`,
      fightscopeRead: `FightScope ${engine.modelVersion}: ${pick.lastName} ${pickPct}% (${engine.confidence}). Most likely path: ${engine.mostLikelyPath.label} (${engine.mostLikelyPath.pct}%). Reliability ${engine.reliability?.overall ?? "n/a"}; agreement ${engine.modelAgreement ?? "n/a"}. Coverage ${engine.coverage.level}.`,
    },
  };
}

export function buildPredictionV3(
  fighterA: Fighter,
  fighterB: Fighter,
  context: MatchupContextV3,
): { engine: EnginePrediction; prediction: Prediction } {
  const engine = predictFightStructural(fighterA, fighterB, context);
  return { engine, prediction: toLegacyPrediction(engine, fighterA, fighterB) };
}

export const buildPredictionV4 = buildPredictionV3;
