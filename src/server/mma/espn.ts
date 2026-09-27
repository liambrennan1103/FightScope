import { findPresentation, PRESENTATION_ESPN_IDS, resolveFighterPresentation } from "@/data/fighter-presentation";
import { deriveAttributes, fightscopeScoreFromAttributes } from "@/server/analysis/attributes";
import {
  applyOpponentFacingStats,
  buildStatBundle,
  fetchFighterStatLogs,
} from "@/server/mma/espn-fight-stats";
import { EMPTY_STATISTICS } from "@/server/analysis/stat-types";
import type { FighterStatBundle } from "@/server/analysis/stat-types";
import type {
  CardSegment,
  Event,
  EventStatus,
  Fight,
  FightOutcome,
  FightResult,
  FightStatus,
  Fighter,
  FighterStatSplits,
  FighterStatistics,
  FinishRecord,
  MmaCatalog,
  RecentFight,
  RecordLine,
  Stance,
} from "@/lib/types";

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard";
const RANKINGS = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/rankings";
const ATHLETE_CORE = "https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc/athletes";
const ATHLETE_WEB = "https://site.web.api.espn.com/apis/common/v3/sports/mma/athletes";

const EMPTY_STATS: FighterStatistics = { ...EMPTY_STATISTICS };

const EMPTY_FINISHES: FinishRecord = {
  koTko: null,
  koTkoLosses: null,
  submissions: null,
  submissionLosses: null,
};

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function inchesToCm(inches: number | null): number | null {
  if (inches == null || inches <= 0) return null;
  return Math.round(inches * 2.54);
}

function parseStance(value: unknown): Stance | null {
  const text = isRecord(value) ? str(value.text) : str(value);
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("south")) return "Southpaw";
  if (lower.includes("switch")) return "Switch";
  if (lower.includes("ortho")) return "Orthodox";
  return null;
}

function parseRecordSummary(summary: string | null): RecordLine {
  if (!summary) return { wins: 0, losses: 0, draws: 0 };
  const match = summary.match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
  if (!match) return { wins: 0, losses: 0, draws: 0 };
  return {
    wins: Number(match[1]),
    losses: Number(match[2]),
    draws: Number(match[3]),
  };
}

function parsePairStat(display: string | null): { wins: number | null; losses: number | null } {
  if (!display) return { wins: null, losses: null };
  const match = display.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return { wins: null, losses: null };
  return { wins: Number(match[1]), losses: Number(match[2]) };
}

interface DraftFighter {
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
  finishes: FinishRecord;
  recentFights: RecentFight[];
  statistics: FighterStatistics;
  statSplits: FighterStatSplits | null;
  headshotUrl?: string | null;
}

function emptyDraft(id: string, name: string): DraftFighter {
  const parts = name.trim().split(/\s+/);
  return {
    id,
    slug: slugify(name) || id,
    name,
    firstName: parts[0] ?? name,
    lastName: parts.slice(1).join(" ") || name,
    nickname: null,
    record: { wins: 0, losses: 0, draws: 0 },
    country: null,
    countryCode: null,
    division: null,
    ranking: null,
    age: null,
    heightCm: null,
    reachCm: null,
    stance: null,
    finishes: { ...EMPTY_FINISHES },
    recentFights: [],
    statistics: { ...EMPTY_STATS },
    statSplits: null,
    headshotUrl: null,
  };
}

function mergeDraft(target: DraftFighter, patch: Partial<DraftFighter>) {
  Object.assign(target, patch, {
    record: patch.record ?? target.record,
    finishes: patch.finishes ?? target.finishes,
    recentFights: patch.recentFights ?? target.recentFights,
    statistics: patch.statistics ?? target.statistics,
    statSplits: patch.statSplits ?? target.statSplits,
  });
}

function toFighter(draft: DraftFighter): Fighter {
  const attributes = deriveAttributes({
    record: draft.record,
    finishes: draft.finishes,
    recentFights: draft.recentFights,
    age: draft.age,
    ranking: draft.ranking,
    statistics: draft.statistics,
    splits: draft.statSplits,
  });
  return {
    id: draft.id,
    slug: draft.slug,
    name: draft.name,
    firstName: draft.firstName,
    lastName: draft.lastName,
    nickname: draft.nickname ?? findPresentation(draft)?.nickname ?? null,
    record: draft.record,
    country: draft.country,
    countryCode: draft.countryCode,
    division: draft.division,
    ranking: draft.ranking,
    age: draft.age,
    heightCm: draft.heightCm,
    reachCm: draft.reachCm,
    stance: draft.stance,
    portrait: resolveFighterPresentation(draft),
    attributes,
    statistics: draft.statistics,
    statSplits: draft.statSplits ?? undefined,
    finishes: draft.finishes,
    recentFights: draft.recentFights.slice(0, 5),
    fightscopeScore: fightscopeScoreFromAttributes(attributes),
    sport: "mma",
  };
}

async function espnGet(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "FightScope/1.0 (MMA analytics)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(`ESPN request failed (${response.status})`);
  }
  return response.json();
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function monthKeys(now = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = -1; offset <= 2; offset += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    keys.push(`${date.getUTCFullYear()}${month}`);
  }
  return keys;
}

function eventStatusFromEspn(raw: unknown): EventStatus {
  if (!isRecord(raw) || !isRecord(raw.type)) return "upcoming";
  const name = str(raw.type.name)?.toUpperCase() ?? "";
  const state = str(raw.type.state)?.toLowerCase() ?? "";
  if (name.includes("CANCEL") || state === "cancelled") return "cancelled";
  if (raw.type.completed === true || name === "STATUS_FINAL" || state === "post") return "completed";
  return "upcoming";
}

function fightStatusFromEspn(raw: unknown): FightStatus {
  return eventStatusFromEspn(raw);
}

function cardSegment(index: number, total: number): CardSegment {
  if (index === total - 1) return "main-event";
  const mainCardStart = Math.max(0, total - 6);
  if (index >= mainCardStart) return "main-card";
  return "prelims";
}

function inferMethod(details: unknown, status: unknown): string | null {
  if (!Array.isArray(details)) {
    if (isRecord(status) && num(status.period) === 5) return "Decision";
    return null;
  }
  const texts = details
    .map((item) => (isRecord(item) && isRecord(item.type) ? str(item.type.text) : null))
    .filter((item): item is string => Boolean(item));
  const joined = texts.join(" | ").toLowerCase();
  if (joined.includes("knockout") || joined.includes("tko") || joined.includes("ko")) return "KO/TKO";
  if (joined.includes("submission")) return "Submission";
  if (joined.includes("decision")) return "Decision";
  if (joined.includes("unofficial winner decision")) return "Decision";
  return null;
}

function competitorRecord(competitor: Json): string | null {
  const records = competitor.records;
  if (!Array.isArray(records)) return null;
  const overall = records.find((item) => isRecord(item) && (item.type === "total" || item.name === "overall"));
  return isRecord(overall) ? str(overall.summary) : null;
}

interface RankInfo {
  ranking: number | "C" | null;
  division: string | null;
  name: string | null;
  nickname: string | null;
  record: string | null;
}

function parseRankings(payload: unknown): Map<string, RankInfo> {
  const map = new Map<string, RankInfo>();
  if (!isRecord(payload) || !Array.isArray(payload.rankings)) return map;

  for (const board of payload.rankings) {
    if (!isRecord(board) || !Array.isArray(board.ranks)) continue;
    const type = str(board.type) ?? "";
    if (type.includes("pound-for-pound")) continue;
    const weightClass = isRecord(board.weightClass) ? str(board.weightClass.text) : null;
    const isChampBoard = type.endsWith("-champions") || type.includes("champions");

    for (const rank of board.ranks) {
      if (!isRecord(rank) || !isRecord(rank.athlete)) continue;
      const id = str(rank.athlete.id);
      if (!id) continue;
      const current = num(rank.current);
      const hasAccolade = rank.hasAccolade === true;
      const existing = map.get(id) ?? {
        ranking: null,
        division: weightClass,
        name: str(rank.athlete.displayName) ?? str(rank.athlete.fullName),
        nickname: str(rank.athlete.nickname),
        record: str(rank.recordSummary),
      };

      if (isChampBoard && (hasAccolade || current === 1)) {
        existing.ranking = "C";
      } else if (existing.ranking !== "C" && current != null) {
        existing.ranking = current;
      }
      if (weightClass) existing.division = weightClass;
      if (!existing.name) existing.name = str(rank.athlete.displayName) ?? str(rank.athlete.fullName);
      if (!existing.nickname) existing.nickname = str(rank.athlete.nickname);
      if (!existing.record) existing.record = str(rank.recordSummary);
      map.set(id, existing);
    }
  }
  return map;
}

function parseAthleteCore(payload: unknown, draft: DraftFighter) {
  if (!isRecord(payload)) return;
  const fullName = str(payload.displayName) ?? str(payload.fullName) ?? draft.name;
  const firstName = str(payload.firstName) ?? draft.firstName;
  const lastName = str(payload.lastName) ?? draft.lastName;
  const slug = str(payload.slug) ?? slugify(fullName);
  const country = str(payload.citizenship);
  const countryCode = isRecord(payload.citizenshipCountry)
    ? str(payload.citizenshipCountry.abbreviation)
    : null;
  const division = isRecord(payload.weightClass) ? str(payload.weightClass.text) : draft.division;
  if (isRecord(payload.headshot)) {
    const href = str(payload.headshot.href);
    if (href) draft.headshotUrl = href;
  }
  mergeDraft(draft, {
    name: fullName,
    firstName,
    lastName,
    slug,
    nickname: str(payload.nickname) ?? draft.nickname,
    age: num(payload.age),
    heightCm: inchesToCm(num(payload.height)),
    reachCm: inchesToCm(num(payload.reach)),
    stance: parseStance(payload.stance),
    country,
    countryCode,
    division,
  });
}

function parseAthleteWeb(payload: unknown, draft: DraftFighter) {
  if (!isRecord(payload) || !isRecord(payload.athlete)) return;
  const athlete = payload.athlete;
  if (!draft.nickname) draft.nickname = str(athlete.nickname);
  if (!draft.age) draft.age = num(athlete.age);
  if (!draft.stance) draft.stance = parseStance(athlete.stance);
  if (!draft.country) draft.country = str(athlete.citizenship);
  if (!draft.countryCode && isRecord(athlete.citizenshipCountry)) {
    draft.countryCode = str(athlete.citizenshipCountry.abbreviation);
  }
  if (!draft.division && isRecord(athlete.weightClass)) {
    draft.division = str(athlete.weightClass.text);
  }

  const summary = isRecord(athlete.statsSummary) ? athlete.statsSummary.statistics : null;
  if (Array.isArray(summary)) {
    for (const item of summary) {
      if (!isRecord(item)) continue;
      const name = str(item.name) ?? "";
      const display = str(item.displayValue);
      if (name === "wins-losses-draws" && display) {
        draft.record = parseRecordSummary(display);
      }
      if (name === "tkos-tkoLosses") {
        const pair = parsePairStat(display);
        draft.finishes.koTko = pair.wins;
        draft.finishes.koTkoLosses = pair.losses;
      }
      if (name === "submissions-submissionLosses") {
        const pair = parsePairStat(display);
        draft.finishes.submissions = pair.wins;
        draft.finishes.submissionLosses = pair.losses;
      }
    }
  }

  const eventsMap = isRecord(payload.eventsMap) ? payload.eventsMap : {};
  const eventKeys = Array.isArray(payload.events) ? payload.events.map((item) => str(item) ?? "") : Object.keys(eventsMap);
  const recent: RecentFight[] = [];
  for (const key of eventKeys) {
    const row = eventsMap[key];
    if (!isRecord(row)) continue;
    const status = isRecord(row.status) ? str(row.status.state) ?? str(row.status.type) : null;
    if (status && /pre|sched/i.test(status)) continue;
    const resultRaw = str(row.gameResult);
    if (!resultRaw) continue;
    const result = resultRaw.toUpperCase();
    if (result !== "W" && result !== "L" && result !== "D" && result !== "NC") continue;
    const opponent = isRecord(row.opponent) ? row.opponent : null;
    recent.push({
      opponentName: opponent ? str(opponent.displayName) ?? str(opponent.fullName) ?? "Unknown" : "Unknown",
      opponentSlug: opponent ? slugify(str(opponent.displayName) ?? str(opponent.fullName) ?? "") : undefined,
      result: result as FightResult,
      method: null,
      round: null,
      time: null,
      date: str(row.gameDate) ?? "",
      eventName: str(row.shortName) ?? str(row.name) ?? "UFC",
    });
    if (recent.length >= 5) break;
  }
  if (recent.length > 0) draft.recentFights = recent;
}

function featuredIds(events: Event[], fights: Fight[]): { eventId: string | null; fightId: string | null } {
  const upcoming = events
    .filter((event) => event.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  const preferred =
    upcoming.find((event) => /ufc/i.test(event.name) && !/contender/i.test(event.name)) ??
    upcoming[0] ??
    null;
  if (!preferred) return { eventId: null, fightId: null };
  const card = preferred.fightIds
    .map((id) => fights.find((fight) => fight.id === id))
    .filter((fight): fight is Fight => Boolean(fight))
    .sort((a, b) => a.boutOrder - b.boutOrder);
  const main = card.find((fight) => fight.cardSegment === "main-event") ?? card[card.length - 1] ?? null;
  return { eventId: preferred.id, fightId: main?.id ?? null };
}

export async function fetchEspnCatalog(options?: {
  includeFightStats?: boolean;
  fightStatsConcurrency?: number;
}): Promise<MmaCatalog> {
  const includeFightStats = options?.includeFightStats ?? process.env.FIGHTSCOPE_SKIP_FIGHT_STATS !== "1";
  const fightStatsConcurrency = options?.fightStatsConcurrency ?? 4;
  const months = monthKeys();
  const [scoreboards, rankingsPayload] = await Promise.all([
    Promise.all(months.map((month) => espnGet(`${SCOREBOARD}?dates=${month}`))),
    espnGet(RANKINGS).catch(() => null),
  ]);

  const rankMap = parseRankings(rankingsPayload);
  const drafts = new Map<string, DraftFighter>();
  const events: Event[] = [];
  const fights: Fight[] = [];
  const seenEvents = new Set<string>();

  function ensureDraft(id: string, name: string): DraftFighter {
    const existing = drafts.get(id);
    if (existing) return existing;
    const draft = emptyDraft(id, name);
    const rank = rankMap.get(id);
    if (rank) {
      draft.ranking = rank.ranking;
      draft.division = rank.division ?? draft.division;
    }
    drafts.set(id, draft);
    return draft;
  }

  for (const board of scoreboards) {
    if (!isRecord(board) || !Array.isArray(board.events)) continue;
    for (const rawEvent of board.events) {
      if (!isRecord(rawEvent)) continue;
      const eventId = str(rawEvent.id);
      const name = str(rawEvent.name);
      if (!eventId || !name || seenEvents.has(eventId)) continue;
      seenEvents.add(eventId);

      const competitions = Array.isArray(rawEvent.competitions) ? rawEvent.competitions : [];
      const firstComp = isRecord(competitions[0]) ? competitions[0] : null;
      const venueObj = firstComp && isRecord(firstComp.venue) ? firstComp.venue : Array.isArray(rawEvent.venues) && isRecord(rawEvent.venues[0]) ? rawEvent.venues[0] : null;
      const address = venueObj && isRecord(venueObj.address) ? venueObj.address : null;
      const city = address ? [str(address.city), str(address.state), str(address.country)].filter(Boolean).join(", ") : "";
      const eventDate = str(rawEvent.date) ?? "";
      const status = eventStatusFromEspn(rawEvent.status);
      const fightIds: string[] = [];

      competitions.forEach((rawComp, index) => {
        if (!isRecord(rawComp)) return;
        const competitors = Array.isArray(rawComp.competitors) ? rawComp.competitors.filter(isRecord) : [];
        if (competitors.length < 2) return;
        const ordered = [...competitors].sort((a, b) => (num(a.order) ?? 0) - (num(b.order) ?? 0));
        const a = ordered[0];
        const b = ordered[1];
        const aId = str(a.id);
        const bId = str(b.id);
        const aAthlete = isRecord(a.athlete) ? a.athlete : {};
        const bAthlete = isRecord(b.athlete) ? b.athlete : {};
        const aName = str(aAthlete.displayName) ?? str(aAthlete.fullName) ?? "Fighter A";
        const bName = str(bAthlete.displayName) ?? str(bAthlete.fullName) ?? "Fighter B";
        if (!aId || !bId) return;

        const draftA = ensureDraft(aId, aName);
        const draftB = ensureDraft(bId, bName);
        const recA = parseRecordSummary(competitorRecord(a));
        const recB = parseRecordSummary(competitorRecord(b));
        if (recA.wins + recA.losses + recA.draws > 0) draftA.record = recA;
        if (recB.wins + recB.losses + recB.draws > 0) draftB.record = recB;

        const division = isRecord(rawComp.type)
          ? str(rawComp.type.text) ?? str(rawComp.type.abbreviation)
          : null;
        if (division && !draftA.division) draftA.division = division;
        if (division && !draftB.division) draftB.division = division;

        const fightId = str(rawComp.id) ?? `${eventId}-${index}`;
        const periods = isRecord(rawComp.format) && isRecord(rawComp.format.regulation)
          ? num(rawComp.format.regulation.periods)
          : 3;
        const fightStatus = fightStatusFromEspn(rawComp.status);
        let outcome: FightOutcome | null = null;
        if (fightStatus === "completed") {
          const winner = ordered.find((item) => item.winner === true);
          const statusObj = isRecord(rawComp.status) ? rawComp.status : {};
          outcome = {
            winnerId: winner ? str(winner.id) : null,
            method: inferMethod(rawComp.details, rawComp.status),
            round: num(statusObj.period),
            time: str(statusObj.displayClock),
          };
        }

        const aSlug = slugify(aName);
        const bSlug = slugify(bName);
        fights.push({
          id: fightId,
          slug: `${aSlug}-vs-${bSlug}-${fightId.slice(-6)}`,
          eventId,
          fighterAId: aId,
          fighterBId: bId,
          division,
          isTitle: /title bout|championship/i.test(str(rawComp.notes) ?? ""),
          titleLabel: undefined,
          cardSegment: cardSegment(index, competitions.length),
          boutOrder: index,
          rounds: periods === 5 ? 5 : 3,
          status: fightStatus,
          outcome,
          sport: "mma",
        });
        fightIds.push(fightId);
      });

      events.push({
        id: eventId,
        slug: slugify(name) || eventId,
        name,
        subtitle: str(rawEvent.shortName) ?? "",
        date: eventDate,
        location: city,
        venue: venueObj ? str(venueObj.fullName) ?? "" : "",
        promotion: /contender/i.test(name) ? "DWCS" : "UFC",
        fightIds,
        status,
        sport: "mma",
      });
    }
  }

  for (const [id, rank] of rankMap) {
    const existing = drafts.get(id);
    if (existing) {
      if (rank.ranking === "C" || existing.ranking == null) existing.ranking = rank.ranking;
      if (!existing.division) existing.division = rank.division;
      if (!existing.nickname) existing.nickname = rank.nickname;
      if (rank.record && existing.record.wins + existing.record.losses === 0) {
        existing.record = parseRecordSummary(rank.record);
      }
      continue;
    }
    if (!rank.name) continue;
    const draft = emptyDraft(id, rank.name);
    draft.ranking = rank.ranking;
    draft.division = rank.division;
    draft.nickname = rank.nickname;
    if (rank.record) draft.record = parseRecordSummary(rank.record);
    drafts.set(id, draft);
  }

  for (const entry of PRESENTATION_ESPN_IDS) {
    if (drafts.has(entry.espnId)) continue;
    drafts.set(entry.espnId, emptyDraft(entry.espnId, entry.name));
  }

  const ids = [...drafts.keys()];
  await mapPool(ids, 8, async (id) => {
    const draft = drafts.get(id)!;
    try {
      const [core, web] = await Promise.all([
        espnGet(`${ATHLETE_CORE}/${id}`).catch(() => null),
        espnGet(`${ATHLETE_WEB}/${id}`).catch(() => null),
      ]);
      parseAthleteCore(core, draft);
      parseAthleteWeb(web, draft);
    } catch (error) {
      console.error("FightScope athlete ingest failed", id, error);
    }
  });

  const statBundles = new Map<string, FighterStatBundle>();
  if (includeFightStats) {
    await mapPool(ids, fightStatsConcurrency, async (id) => {
      const draft = drafts.get(id);
      if (!draft || !/^\d+$/.test(id)) return;
      try {
        const logs = await fetchFighterStatLogs(id);
        if (logs.length === 0) return;
        const bundle = buildStatBundle(id, logs);
        statBundles.set(id, bundle);
      } catch (error) {
        console.error("FightScope fight-stat ingest failed", id, error);
      }
    });
    applyOpponentFacingStats(statBundles);
    for (const [id, bundle] of statBundles) {
      const draft = drafts.get(id);
      if (!draft) continue;
      draft.statistics = bundle.statistics;
      draft.statSplits = bundle.splits;
      // Enrich recent fights with method/round/time when ESPN history has them.
      if (draft.recentFights.length === 0 && bundle.logs.length > 0) {
        draft.recentFights = bundle.logs.slice(0, 5).map((log) => ({
          opponentName: log.opponentName ?? "Unknown",
          opponentSlug: undefined,
          result: log.result ?? "NC",
          method: log.method,
          round: log.round,
          time: log.time,
          date: log.date,
          eventName: "UFC",
        }));
      } else {
        draft.recentFights = draft.recentFights.map((fight) => {
          const match = bundle.logs.find(
            (log) =>
              log.date.slice(0, 10) === fight.date.slice(0, 10) ||
              (log.opponentName &&
                fight.opponentName &&
                log.opponentName.toLowerCase() === fight.opponentName.toLowerCase()),
          );
          if (!match) return fight;
          return {
            ...fight,
            method: fight.method ?? match.method,
            round: fight.round ?? match.round,
            time: fight.time ?? match.time,
          };
        });
      }
    }
  }

  const fightsByFighter = new Map<string, Fight[]>();
  for (const fight of fights) {
    if (fight.status !== "completed") continue;
    for (const fighterId of [fight.fighterAId, fight.fighterBId]) {
      const list = fightsByFighter.get(fighterId) ?? [];
      list.push(fight);
      fightsByFighter.set(fighterId, list);
    }
  }
  const eventsById = new Map(events.map((event) => [event.id, event]));
  for (const [fighterId, list] of fightsByFighter) {
    const draft = drafts.get(fighterId);
    if (!draft || draft.recentFights.length >= 5) continue;
    const extra: RecentFight[] = list
      .sort((a, b) => (eventsById.get(b.eventId)?.date ?? "").localeCompare(eventsById.get(a.eventId)?.date ?? ""))
      .map((fight) => {
        const opponentId = fight.fighterAId === fighterId ? fight.fighterBId : fight.fighterAId;
        const opponent = drafts.get(opponentId);
        const won = fight.outcome?.winnerId === fighterId;
        const lost = fight.outcome?.winnerId && fight.outcome.winnerId !== fighterId;
        const result: FightResult = won ? "W" : lost ? "L" : "D";
        return {
          opponentName: opponent?.name ?? "Unknown",
          opponentSlug: opponent?.slug,
          result,
          method: fight.outcome?.method ?? null,
          round: fight.outcome?.round ?? null,
          time: fight.outcome?.time ?? null,
          date: eventsById.get(fight.eventId)?.date ?? "",
          eventName: eventsById.get(fight.eventId)?.name ?? "UFC",
        };
      });
    const seen = new Set(draft.recentFights.map((item) => `${item.date}-${item.opponentName}`));
    for (const item of extra) {
      const key = `${item.date}-${item.opponentName}`;
      if (seen.has(key)) continue;
      draft.recentFights.push(item);
      seen.add(key);
      if (draft.recentFights.length >= 5) break;
    }
  }

  const fighters = [...drafts.values()]
    .filter((draft) => draft.name && !draft.name.startsWith("Fighter "))
    .filter((draft) => !/^(tba|to be announced|opponent tba)$/i.test(draft.name.trim()))
    .map(toFighter)
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.name.localeCompare(b.name));

  const fighterIds = new Set(fighters.map((fighter) => fighter.id));
  const usableFights = fights.filter(
    (fight) => fighterIds.has(fight.fighterAId) && fighterIds.has(fight.fighterBId),
  );
  const usableEvents = events
    .map((event) => ({
      ...event,
      fightIds: event.fightIds.filter((id) => usableFights.some((fight) => fight.id === id)),
    }))
    .filter((event) => event.fightIds.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const featured = featuredIds(usableEvents, usableFights);

  return {
    lastUpdated: new Date().toISOString(),
    source: "espn-ufc",
    stale: false,
    fighters,
    events: usableEvents,
    fights: usableFights,
    featuredEventId: featured.eventId,
    featuredFightId: featured.fightId,
  };
}
