import assert from "node:assert/strict";
import type { Fighter, Prediction } from "@/lib/types";
import { boutsAsOf, careerRecordAsOf, fighterAsOf } from "@/server/prediction/as-of";
import { buildStructuralPrediction } from "@/server/analysis/predict";
import { predictFightStructural } from "@/server/prediction/engine";
import { resolveConflict } from "@/server/prediction/sources/registry";

/** Mirror of applyLlmEnrichment contract — Claude must not mutate numbers. */
function applyNarrativeOnly(baseline: Prediction, analysis: Prediction["analysis"]): Prediction {
  return { ...baseline, analysis };
}

function stubFighter(id: string, overrides: Partial<Fighter> = {}): Fighter {
  return {
    id,
    slug: id,
    name: `Fighter ${id}`,
    firstName: "Fighter",
    lastName: id,
    nickname: null,
    record: { wins: 10, losses: 3, draws: 0 },
    country: null,
    countryCode: null,
    division: "Lightweight",
    ranking: null,
    age: 28,
    heightCm: 178,
    reachCm: 180,
    stance: "Orthodox",
    portrait: { src: null, objectPosition: "50% 14%", status: "fallback" },
    attributes: {
      striking: 60,
      power: 58,
      wrestling: 55,
      grappling: 54,
      cardio: 62,
      defense: 57,
      durability: 60,
      experience: 58,
      recentForm: 61,
    },
    statistics: {
      sigStrikesLandedPerMin: 4.2,
      sigStrikeAccuracy: 45,
      sigStrikesAbsorbedPerMin: 3.5,
      strikingDefense: 55,
      takedownsPer15: 1.2,
      takedownAccuracy: 40,
      takedownDefense: 65,
      submissionAttemptsPer15: 0.4,
      knockdownsPer15: 0.5,
    },
    finishes: { koTko: 4, koTkoLosses: 1, submissions: 2, submissionLosses: 1 },
    recentFights: [
      {
        opponentName: "Opp",
        result: "W",
        method: "KO/TKO",
        round: 1,
        time: "2:00",
        date: "2025-01-01T00:00:00.000Z",
        eventName: "Event",
      },
    ],
    fightscopeScore: 58,
    sport: "mma",
    ...overrides,
  };
}

function sumJoint(j: {
  aKoTko: number;
  aSubmission: number;
  aDecision: number;
  bKoTko: number;
  bSubmission: number;
  bDecision: number;
  draw: number;
}) {
  return (
    j.aKoTko +
    j.aSubmission +
    j.aDecision +
    j.bKoTko +
    j.bSubmission +
    j.bDecision +
    j.draw
  );
}

const a = stubFighter("a");
const b = stubFighter("b", {
  attributes: { ...a.attributes, striking: 70, power: 72, recentForm: 70 },
  finishes: { koTko: 8, koTkoLosses: 0, submissions: 1, submissionLosses: 0 },
  statistics: {
    ...a.statistics,
    knockdownsPer15: 1.2,
    sigStrikesLandedPerMin: 5.5,
  },
});

const engine = predictFightStructural(a, b, { rounds: 3, isTitle: false, division: "Lightweight" });
assert.equal(sumJoint(engine.joint), 100, "joint sums to 100");
assert.equal(
  engine.methods.koTko + engine.methods.decision + engine.methods.submission,
  100,
  "methods sum to 100",
);
assert.equal(
  engine.winner.fighterAWinPct + engine.winner.fighterBWinPct + engine.winner.drawPct,
  100,
  "winner shares sum to 100",
);
assert.equal(
  engine.winner.fighterAWinPct,
  engine.joint.aKoTko + engine.joint.aSubmission + engine.joint.aDecision,
  "A win% from joint",
);
assert.equal(
  engine.winner.fighterBWinPct,
  engine.joint.bKoTko + engine.joint.bSubmission + engine.joint.bDecision,
  "B win% from joint",
);

const legacy = buildStructuralPrediction(a, b, { rounds: 3, isTitle: false, division: null });
assert.ok(legacy.modelVersion, "model version stamped");
assert.ok(legacy.jointOutcomes, "joint on legacy prediction");
assert.ok(!Number.isNaN(legacy.fighterAWinPct), "no NaN");

const enriched = applyNarrativeOnly(legacy, {
  fightscopeRead: "Narrative only.",
  howAWins: "A path",
  howBWins: "B path",
});
assert.equal(enriched.fighterAWinPct, legacy.fighterAWinPct, "narrative cannot overwrite win%");
assert.equal(enriched.methods.decision, legacy.methods.decision, "narrative cannot overwrite methods");

const asOf = fighterAsOf(
  {
    ...a,
    record: { wins: 11, losses: 3, draws: 0 },
    finishes: { koTko: 5, koTkoLosses: 1, submissions: 2, submissionLosses: 1 },
    recentFights: [
      {
        opponentName: "Future",
        result: "W",
        method: "Decision",
        round: 3,
        time: "5:00",
        date: "2026-06-01T00:00:00.000Z",
        eventName: "Future",
      },
      {
        opponentName: "Past",
        result: "W",
        method: "KO/TKO",
        round: 1,
        time: "1:00",
        date: "2024-01-01T00:00:00.000Z",
        eventName: "Past",
      },
    ],
  },
  "2025-06-01T00:00:00.000Z",
  {
    leakOutcome: {
      winnerId: "a",
      method: "KO/TKO",
      fighterAId: "a",
      fighterBId: "b",
    },
  },
);
assert.equal(asOf.recentFights.length, 1, "future fights stripped");
assert.equal(asOf.record.wins, 10, "leak win removed");
assert.equal(asOf.finishes.koTko, 4, "leak KO removed");

// careerRecordAsOf must undo every post-asOf recent result (not only leakOutcome)
const careerCut = careerRecordAsOf(
  {
    ...a,
    record: { wins: 12, losses: 3, draws: 1 },
    recentFights: [
      {
        opponentName: "F1",
        result: "W",
        method: "KO/TKO",
        round: 1,
        time: "1:00",
        date: "2026-01-01T00:00:00.000Z",
        eventName: "Future1",
      },
      {
        opponentName: "F2",
        result: "L",
        method: "Decision",
        round: 3,
        time: "5:00",
        date: "2025-08-01T00:00:00.000Z",
        eventName: "Future2",
      },
      {
        opponentName: "Past",
        result: "W",
        method: "Submission",
        round: 2,
        time: "2:00",
        date: "2023-01-01T00:00:00.000Z",
        eventName: "Past",
      },
    ],
  },
  "2025-01-01T00:00:00.000Z",
);
assert.equal(careerCut.wins, 11, "as-of undoes future win");
assert.equal(careerCut.losses, 2, "as-of undoes future loss");
assert.equal(boutsAsOf({ ...a, record: careerCut, recentFights: [] }, "2025-01-01T00:00:00.000Z"), 14);

// Explicit leakage injection: future fight must never appear in as-of features
const leaky = stubFighter("leak", {
  recentFights: [
    {
      opponentName: "FutureOpp",
      result: "W",
      method: "KO/TKO",
      round: 1,
      time: "1:00",
      date: "2027-01-01T00:00:00.000Z",
      eventName: "Future Card",
    },
    {
      opponentName: "PastOpp",
      result: "L",
      method: "Decision",
      round: 3,
      time: "5:00",
      date: "2023-01-01T00:00:00.000Z",
      eventName: "Past Card",
    },
  ],
});
const cut = fighterAsOf(leaky, "2024-06-01T00:00:00.000Z");
assert.ok(
  cut.recentFights.every((rf) => Date.parse(rf.date) < Date.parse("2024-06-01T00:00:00.000Z")),
  "as-of must ignore future fights",
);
assert.equal(cut.recentFights.length, 1);

// Low-sample fighter should not produce near-certain pick vs established without evidence
const prospect = stubFighter("prospect", {
  record: { wins: 2, losses: 0, draws: 0 },
  finishes: { koTko: 2, koTkoLosses: 0, submissions: 0, submissionLosses: 0 },
  recentFights: [],
  statistics: {
    sigStrikesLandedPerMin: null,
    sigStrikeAccuracy: null,
    sigStrikesAbsorbedPerMin: null,
    strikingDefense: null,
    takedownsPer15: null,
    takedownAccuracy: null,
    takedownDefense: null,
    submissionAttemptsPer15: null,
    knockdownsPer15: null,
  },
});
const established = stubFighter("vet", {
  record: { wins: 20, losses: 8, draws: 0 },
});
const lowSamplePred = predictFightStructural(prospect, established, {
  rounds: 3,
  isTitle: false,
  division: "Heavyweight",
});
const favLow = Math.max(
  lowSamplePred.winner.fighterAWinPct,
  lowSamplePred.winner.fighterBWinPct,
);
assert.ok(lowSamplePred.reliability, "reliability present");
assert.ok(
  (lowSamplePred.reliability?.sampleSize ?? 1) < 0.7,
  "low sample reliability should be reduced",
);
assert.ok(favLow <= 92, "low-sample should not routinely spit out extreme certainty");

// Model version stamp
assert.ok(
  engine.modelVersion.includes("v4") || engine.modelVersion.includes("prediction_engine"),
  "model version stamped",
);

const resolved = resolveConflict("record", [
  { source: "editorial", value: "10-3-0", weight: 0.7 },
  { source: "official", value: "11-3-0", weight: 1.0 },
]);
assert.equal(resolved.source, "official");
assert.equal(resolved.value, "11-3-0");

console.log("prediction.selftest OK");
