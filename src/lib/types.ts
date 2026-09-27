export type Sport = "mma";

export type Stance = "Orthodox" | "Southpaw" | "Switch";

export type FightResult = "W" | "L" | "D" | "NC";

export type CardSegment = "main-event" | "main-card" | "prelims";

export type Confidence = "Low" | "Medium" | "High";

export type PlanId = "free" | "starter" | "pro";

export type EventStatus = "upcoming" | "completed" | "cancelled";

export type FightStatus = "upcoming" | "completed" | "cancelled";

export type PortraitStatus = "curated" | "sourced" | "fallback";

export interface FighterPortraitConfig {
  src: string | null;
  objectPosition: string;
  status: PortraitStatus;
}

export interface RecordLine {
  wins: number;
  losses: number;
  draws: number;
  noContests?: number;
}

export interface FighterStatistics {
  sigStrikesLandedPerMin: number | null;
  sigStrikeAccuracy: number | null;
  sigStrikesAbsorbedPerMin: number | null;
  strikingDefense: number | null;
  takedownsPer15: number | null;
  takedownAccuracy: number | null;
  takedownDefense: number | null;
  /** ESPN SM column aggregated — submissions landed per 15 min (not distinct attempts). */
  submissionAttemptsPer15: number | null;
  knockdownsPer15: number | null;
}

/** Extra career splits derived from ESPN per-fight tables (optional on fighters). */
export interface FighterStatSplits {
  headPct: number | null;
  bodyPct: number | null;
  legPct: number | null;
  distanceSigLanded: number;
  clinchSigLanded: number;
  groundSigLanded: number;
  reversals: number;
  advances: number;
  ufcFightCount: number | null;
  fiveRoundFightCount: number | null;
  daysSinceLastFight: number | null;
  titleFightCount: number | null;
}

export interface FinishRecord {
  koTko: number | null;
  koTkoLosses: number | null;
  submissions: number | null;
  submissionLosses: number | null;
}

export interface RecentFight {
  opponentName: string;
  opponentSlug?: string;
  result: FightResult;
  method: string | null;
  round: number | null;
  time: string | null;
  date: string;
  eventName: string;
}

export interface Fighter {
  id: string;
  slug: string;
  name: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  record: RecordLine;
  country: string | null;
  countryCode: string | null;
  division: string | null;
  ranking: number | "C" | null;
  age: number | null;
  heightCm: number | null;
  reachCm: number | null;
  stance: Stance | null;
  portrait: FighterPortraitConfig;
  attributes: Record<string, number>;
  statistics: FighterStatistics;
  /** Present when ESPN fight-stat tables were ingested. */
  statSplits?: FighterStatSplits;
  finishes: FinishRecord;
  recentFights: RecentFight[];
  fightscopeScore: number;
  sport: Sport;
}

export interface MethodDistribution {
  koTko: number;
  decision: number;
  submission: number;
}

/** Six-way (+ draw) joint path distribution from prediction_engine_v3. */
export interface JointOutcomeDistribution {
  aKoTko: number;
  aSubmission: number;
  aDecision: number;
  bKoTko: number;
  bSubmission: number;
  bDecision: number;
  draw: number;
}

export interface PredictionFactor {
  factor: string;
  label: string;
  edge: "fighterA" | "fighterB" | "neutral";
  magnitude: number;
}

export interface FightAnalysisCopy {
  howAWins: string;
  howBWins: string;
  fightscopeRead: string;
}

export interface Prediction {
  fighterAWinPct: number;
  fighterBWinPct: number;
  predictedWinnerId: string;
  confidence: Confidence;
  methods: MethodDistribution;
  analysis: FightAnalysisCopy;
  keyAdvantages: {
    fighterA: string[];
    fighterB: string[];
  };
  /** Structural engine metadata (v3+). */
  jointOutcomes?: JointOutcomeDistribution;
  topFactors?: PredictionFactor[];
  mostLikelyPath?: {
    label: string;
    pct: number;
    method: string;
  };
  modelVersion?: string;
  featureVersion?: string;
  coverageScore?: number;
  coverageLevel?: "HIGH" | "MEDIUM" | "LOW";
  coverageReasons?: string[];
}

export interface FightOutcome {
  winnerId: string | null;
  method: string | null;
  round: number | null;
  time: string | null;
}

export interface Fight {
  id: string;
  slug: string;
  eventId: string;
  fighterAId: string;
  fighterBId: string;
  division: string | null;
  isTitle: boolean;
  titleLabel?: string;
  cardSegment: CardSegment;
  boutOrder: number;
  rounds: 3 | 5;
  status: FightStatus;
  outcome: FightOutcome | null;
  sport: Sport;
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  date: string;
  location: string;
  venue: string;
  promotion: string;
  fightIds: string[];
  status: EventStatus;
  sport: Sport;
}

export interface FightView {
  fight: Fight;
  event: Event;
  fighterA: Fighter;
  fighterB: Fighter;
  prediction: Prediction;
}

export interface MmaCatalog {
  lastUpdated: string;
  source: string;
  stale: boolean;
  fighters: Fighter[];
  events: Event[];
  fights: Fight[];
  featuredEventId: string | null;
  featuredFightId: string | null;
}

export type SearchFighter = Pick<
  Fighter,
  "id" | "slug" | "name" | "nickname" | "lastName" | "division" | "record" | "portrait"
>;

export type SearchEvent = Pick<Event, "id" | "slug" | "name" | "date" | "location">;

export type SearchFight = {
  fight: Pick<Fight, "id" | "slug">;
  event: Pick<Event, "name">;
  fighterA: SearchFighter;
  fighterB: SearchFighter;
};

export interface SearchIndex {
  fighters: SearchFighter[];
  events: SearchEvent[];
  fights: SearchFight[];
}

export interface PricingTier {
  id: PlanId;
  name: string;
  priceLabel: string;
  cadence?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}
