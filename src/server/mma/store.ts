import { unstable_cache } from "next/cache";
import { analyzeFightSync } from "@/server/analysis/engine";
import type { Event, Fight, FightView, Fighter, MmaCatalog, SearchFighter, SearchIndex } from "@/lib/types";
import { applyFighterPresentation } from "@/data/fighter-presentation";
import { deriveAttributes, fightscopeScoreFromAttributes } from "@/server/analysis/attributes";
import { fetchEspnCatalog } from "./espn";
import snapshot from "./snapshot.json";

const SNAPSHOT = snapshot as MmaCatalog;

function cloneSnapshot(): MmaCatalog {
  return {
    ...SNAPSHOT,
    fighters: SNAPSHOT.fighters ?? [],
    events: SNAPSHOT.events ?? [],
    fights: SNAPSHOT.fights ?? [],
    lastUpdated: SNAPSHOT.lastUpdated ?? new Date().toISOString(),
    source: SNAPSHOT.source ?? "espn-ufc",
    stale: true,
    featuredEventId: SNAPSHOT.featuredEventId ?? null,
    featuredFightId: SNAPSHOT.featuredFightId ?? null,
  };
}

/** Live ESPN scoreboard refresh often skips HTML fight-stat scrape — keep snapshot rates. */
function mergeSnapshotStats(live: MmaCatalog): MmaCatalog {
  const prior = new Map((SNAPSHOT.fighters ?? []).map((fighter) => [fighter.id, fighter]));
  const fighters = live.fighters.map((fighter) => {
    const snap = prior.get(fighter.id);
    if (!snap) return fighter;
    const hasLiveRates = Object.values(fighter.statistics).some((value) => value != null);
    if (hasLiveRates) return fighter;
    const statistics = snap.statistics ?? fighter.statistics;
    const statSplits = snap.statSplits ?? fighter.statSplits;
    const attributes = deriveAttributes({
      record: fighter.record,
      finishes: fighter.finishes,
      recentFights: fighter.recentFights.length ? fighter.recentFights : snap.recentFights,
      age: fighter.age ?? snap.age,
      ranking: fighter.ranking ?? snap.ranking,
      statistics,
      splits: statSplits ?? null,
    });
    return {
      ...fighter,
      statistics,
      statSplits,
      attributes,
      fightscopeScore: fightscopeScoreFromAttributes(attributes),
      recentFights: fighter.recentFights.length ? fighter.recentFights : snap.recentFights,
    };
  });
  return { ...live, fighters };
}

async function loadLiveCatalog(): Promise<MmaCatalog> {
  const catalog = await Promise.race([
    // Live path skips heavy HTML fight-stat scrape (snapshot/refresh owns that).
    fetchEspnCatalog({ includeFightStats: false }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("ESPN catalog timed out")), 28000);
    }),
  ]);
  if (!catalog.fighters.length || !catalog.events.length) {
    throw new Error("ESPN catalog empty");
  }
  return catalog;
}

const getCachedCatalog = unstable_cache(
  async () => loadLiveCatalog(),
  ["fightscope-mma-catalog-v4"],
  { revalidate: 1800 },
);

function withPresentation(catalog: MmaCatalog): MmaCatalog {
  const fighters = catalog.fighters
    .filter((fighter) => !/^(tba|to be announced|opponent tba)$/i.test(fighter.name.trim()))
    .map((fighter) => {
      const presented = applyFighterPresentation(fighter);
      const attributes = deriveAttributes({
        record: presented.record,
        finishes: presented.finishes,
        recentFights: presented.recentFights,
        age: presented.age,
        ranking: presented.ranking,
        statistics: presented.statistics,
        splits: presented.statSplits ?? null,
      });
      return {
        ...presented,
        attributes,
        fightscopeScore: fightscopeScoreFromAttributes(attributes),
      };
    });
  const fighterIds = new Set(fighters.map((fighter) => fighter.id));
  const fights = catalog.fights.filter(
    (fight) => fighterIds.has(fight.fighterAId) && fighterIds.has(fight.fighterBId),
  );
  const fightIds = new Set(fights.map((fight) => fight.id));
  const events = catalog.events
    .map((event) => ({ ...event, fightIds: event.fightIds.filter((id) => fightIds.has(id)) }))
    .filter((event) => event.fightIds.length > 0);
  return { ...catalog, fighters, fights, events };
}

export async function getCatalog(): Promise<MmaCatalog> {
  try {
    return withPresentation(mergeSnapshotStats(await getCachedCatalog()));
  } catch (error) {
    console.error("FightScope MMA provider failed; using last snapshot", error);
    return withPresentation(cloneSnapshot());
  }
}

export function indexCatalog(catalog: MmaCatalog) {
  return {
    fightersById: Object.fromEntries(catalog.fighters.map((fighter) => [fighter.id, fighter])),
    fightersBySlug: Object.fromEntries(catalog.fighters.map((fighter) => [fighter.slug, fighter])),
    eventsById: Object.fromEntries(catalog.events.map((event) => [event.id, event])),
    eventsBySlug: Object.fromEntries(catalog.events.map((event) => [event.slug, event])),
    fightsById: Object.fromEntries(catalog.fights.map((fight) => [fight.id, fight])),
    fightsBySlug: Object.fromEntries(catalog.fights.map((fight) => [fight.slug, fight])),
  };
}

export function toFightView(
  catalog: MmaCatalog,
  fight: Fight,
  tables = indexCatalog(catalog),
): FightView | null {
  const event = tables.eventsById[fight.eventId];
  const fighterA = tables.fightersById[fight.fighterAId];
  const fighterB = tables.fightersById[fight.fighterBId];
  if (!event || !fighterA || !fighterB) return null;
  return {
    fight,
    event,
    fighterA,
    fighterB,
    prediction: analyzeFightSync(fighterA, fighterB, {
      rounds: fight.rounds,
      isTitle: fight.isTitle,
      division: fight.division,
    }),
  };
}

export async function getFighterBySlug(slug: string): Promise<Fighter | undefined> {
  const catalog = await getCatalog();
  return catalog.fighters.find((fighter) => fighter.slug === slug);
}

export async function getFighterById(id: string): Promise<Fighter | undefined> {
  const catalog = await getCatalog();
  return catalog.fighters.find((fighter) => fighter.id === id);
}

export async function getEventBySlug(slug: string): Promise<Event | undefined> {
  const catalog = await getCatalog();
  return catalog.events.find((event) => event.slug === slug);
}

export async function getFightBySlug(slug: string): Promise<Fight | undefined> {
  const catalog = await getCatalog();
  return catalog.fights.find((fight) => fight.slug === slug);
}

export async function getFightView(slug: string): Promise<FightView | null> {
  const catalog = await getCatalog();
  const fight = catalog.fights.find((item) => item.slug === slug);
  if (!fight) return null;
  return toFightView(catalog, fight);
}

export function getEventFights(catalog: MmaCatalog, event: Event): FightView[] {
  const tables = indexCatalog(catalog);
  return event.fightIds
    .map((id) => tables.fightsById[id])
    .filter((fight): fight is Fight => Boolean(fight))
    .map((fight) => toFightView(catalog, fight, tables))
    .filter((view): view is FightView => view !== null)
    .sort((a, b) => a.fight.boutOrder - b.fight.boutOrder);
}

export function getUpcomingFightViews(catalog: MmaCatalog): FightView[] {
  const tables = indexCatalog(catalog);
  return catalog.fights
    .filter((fight) => fight.status === "upcoming")
    .map((fight) => toFightView(catalog, fight, tables))
    .filter((view): view is FightView => view !== null)
    .sort(
      (a, b) =>
        a.event.date.localeCompare(b.event.date) || a.fight.boutOrder - b.fight.boutOrder,
    );
}

export function getFeaturedFightView(catalog: MmaCatalog): FightView | null {
  if (catalog.featuredFightId) {
    const fight = catalog.fights.find((item) => item.id === catalog.featuredFightId);
    if (fight) return toFightView(catalog, fight);
  }
  return getUpcomingFightViews(catalog)[0] ?? null;
}

export function getFightsForFighter(catalog: MmaCatalog, fighterId: string): FightView[] {
  const tables = indexCatalog(catalog);
  return catalog.fights
    .filter((fight) => fight.fighterAId === fighterId || fight.fighterBId === fighterId)
    .map((fight) => toFightView(catalog, fight, tables))
    .filter((view): view is FightView => view !== null)
    .sort((a, b) => b.event.date.localeCompare(a.event.date));
}

export function searchCatalog(
  catalog: MmaCatalog,
  query: string,
): {
  fighters: Fighter[];
  events: Event[];
  fights: FightView[];
} {
  const q = query.trim().toLowerCase();
  if (!q) return { fighters: [], events: [], fights: [] };

  const fighters = catalog.fighters
    .filter((fighter) =>
      [fighter.name, fighter.nickname ?? "", fighter.division ?? "", fighter.country ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
    .slice(0, 8);

  const events = catalog.events
    .filter((event) =>
      [event.name, event.subtitle, event.location, event.promotion].join(" ").toLowerCase().includes(q),
    )
    .slice(0, 6);

  const fights = getUpcomingFightViews(catalog)
    .filter((view) =>
      [
        view.fighterA.name,
        view.fighterB.name,
        view.fight.division ?? "",
        view.event.name,
        `${view.fighterA.lastName} vs ${view.fighterB.lastName}`,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
    .slice(0, 8);

  return { fighters, events, fights };
}

function slimFighter(fighter: Fighter): SearchFighter {
  return {
    id: fighter.id,
    slug: fighter.slug,
    name: fighter.name,
    nickname: fighter.nickname,
    lastName: fighter.lastName,
    division: fighter.division,
    record: fighter.record,
    portrait: fighter.portrait,
  };
}

export function toSearchIndex(catalog: MmaCatalog): SearchIndex {
  return {
    fighters: catalog.fighters.map(slimFighter),
    events: catalog.events.map((event) => ({
      id: event.id,
      slug: event.slug,
      name: event.name,
      date: event.date,
      location: event.location,
    })),
    fights: getUpcomingFightViews(catalog)
      .slice(0, 40)
      .map((view) => ({
        fight: { id: view.fight.id, slug: view.fight.slug },
        event: { name: view.event.name },
        fighterA: slimFighter(view.fighterA),
        fighterB: slimFighter(view.fighterB),
      })),
  };
}
