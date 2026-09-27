import { analyzeFight } from "@/server/analysis/engine";
import {
  markAnalysesStaleForFighter,
  recordAnalysisRun,
  upsertFighterStatSnapshot,
} from "@/server/analysis/cache";
import { assessDataQuality } from "@/server/analysis/data-quality";
import { fetchEspnCatalog } from "@/server/mma/espn";
import {
  applyOpponentFacingStats,
  buildStatBundle,
  fetchFighterStatLogs,
} from "@/server/mma/espn-fight-stats";
import type { FighterStatBundle } from "@/server/analysis/stat-types";
import { getCatalog, getUpcomingFightViews, indexCatalog } from "@/server/mma/store";
import type { Fighter } from "@/lib/types";
import { writeFileSync } from "node:fs";
import path from "node:path";

async function mapPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, () => run()));
}

function daysUntil(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (t - Date.now()) / 86_400_000;
}

export async function syncFighterSnapshots(
  fighters: Fighter[],
  triggerSource: string,
): Promise<{ checked: number; changed: number; staleMarked: number }> {
  let changed = 0;
  let staleMarked = 0;
  for (const fighter of fighters) {
    const quality = assessDataQuality(fighter, fighter);
    const result = await upsertFighterStatSnapshot(fighter, quality);
    if (result.changed && result.previousHash) {
      changed += 1;
      staleMarked += await markAnalysesStaleForFighter(
        fighter.id,
        `fighter input hash changed (${result.previousHash} → ${fighter.id})`,
      );
    } else if (result.changed) {
      changed += 1;
    }
  }
  await recordAnalysisRun({
    runType: "scheduled_refresh",
    triggerSource,
    status: "succeeded",
    details: { checked: fighters.length, changed, staleMarked },
  });
  return { checked: fighters.length, changed, staleMarked };
}

export async function enrichFightersWithFightStats(fighterIds: string[]): Promise<Map<string, FighterStatBundle>> {
  const bundles = new Map<string, FighterStatBundle>();
  await mapPool(fighterIds, 4, async (id) => {
    if (!/^\d+$/.test(id)) return;
    try {
      const logs = await fetchFighterStatLogs(id);
      if (!logs.length) return;
      bundles.set(id, buildStatBundle(id, logs));
    } catch (error) {
      console.error("enrich fight stats failed", id, error);
    }
  });
  applyOpponentFacingStats(bundles);
  return bundles;
}

/** Daily: refresh upcoming events scoreboard (no full roster HTML scrape). */
export async function jobRefreshUpcomingEvents(triggerSource = "cron:upcoming-events") {
  const catalog = await fetchEspnCatalog({ includeFightStats: false });
  // Persist lightweight snapshot merge is owned by callers in production via Netlify rebuild
  // or writing snapshot when running in a persistent environment.
  try {
    const out = path.join(process.cwd(), "src/server/mma/snapshot.json");
    writeFileSync(out, JSON.stringify(catalog));
  } catch (error) {
    console.warn("Could not write snapshot.json in this environment", error);
  }
  const upcoming = catalog.fights.filter((fight) => fight.status === "upcoming");
  await recordAnalysisRun({
    runType: "scheduled_refresh",
    triggerSource,
    status: "succeeded",
    details: { events: catalog.events.length, upcomingFights: upcoming.length },
  });
  return { events: catalog.events.length, upcomingFights: upcoming.length };
}

/** Weekly: broader roster refresh without hammering every few hours. */
export async function jobWeeklyRosterRefresh(triggerSource = "cron:weekly-roster") {
  const catalog = await fetchEspnCatalog({ includeFightStats: false });
  try {
    writeFileSync(path.join(process.cwd(), "src/server/mma/snapshot.json"), JSON.stringify(catalog));
  } catch (error) {
    console.warn("Could not write snapshot.json", error);
  }
  const live = await getCatalog();
  const sync = await syncFighterSnapshots(live.fighters, triggerSource);
  return { fighters: catalog.fighters.length, ...sync };
}

/** Daily: enrich fighters who appear on upcoming cards. */
export async function jobEnrichUpcomingFighters(triggerSource = "cron:upcoming-fighters") {
  const catalog = await getCatalog();
  const upcoming = getUpcomingFightViews(catalog);
  const ids = [...new Set(upcoming.flatMap((view) => [view.fighterA.id, view.fighterB.id]))];
  const bundles = await enrichFightersWithFightStats(ids);

  // Update in-memory-equivalent fighters for hash sync using catalog copies.
  const updated: Fighter[] = [];
  for (const fighter of catalog.fighters) {
    const bundle = bundles.get(fighter.id);
    if (!bundle) continue;
    updated.push({
      ...fighter,
      statistics: bundle.statistics,
      statSplits: bundle.splits,
    });
  }
  const sync = await syncFighterSnapshots(updated.length ? updated : catalog.fighters.filter((f) => ids.includes(f.id)), triggerSource);
  return { targeted: ids.length, enriched: bundles.size, ...sync };
}

/** Near-term cards: 7-day / 24-hour scoped refresh + stale detection. */
export async function jobNearTermRefresh(options: {
  withinDays: number;
  triggerSource: string;
  enrichStats?: boolean;
}) {
  const catalog = await getCatalog();
  const tables = indexCatalog(catalog);
  const events = catalog.events.filter(
    (event) => event.status === "upcoming" && daysUntil(event.date) <= options.withinDays,
  );
  const fightIds = new Set(events.flatMap((event) => event.fightIds));
  const fights = catalog.fights.filter((fight) => fightIds.has(fight.id));
  const fighterIds = [
    ...new Set(fights.flatMap((fight) => [fight.fighterAId, fight.fighterBId])),
  ];

  if (options.enrichStats) {
    await enrichFightersWithFightStats(fighterIds);
  }

  const fighters = fighterIds
    .map((id) => tables.fightersById[id])
    .filter((fighter): fighter is Fighter => Boolean(fighter));
  const sync = await syncFighterSnapshots(fighters, options.triggerSource);
  return { events: events.length, fights: fights.length, fighters: fighters.length, ...sync };
}

/** Post-event: refresh recently completed events and invalidate related analyses. */
export async function jobPostEventRefresh(triggerSource = "cron:post-event") {
  const catalog = await fetchEspnCatalog({ includeFightStats: false });
  const completed = catalog.fights.filter((fight) => fight.status === "completed");
  const recent = completed.filter((fight) => {
    const event = catalog.events.find((item) => item.id === fight.eventId);
    if (!event) return false;
    const ageDays = -daysUntil(event.date);
    return ageDays >= 0 && ageDays <= 3;
  });
  const fighterIds = [...new Set(recent.flatMap((fight) => [fight.fighterAId, fight.fighterBId]))];
  await enrichFightersWithFightStats(fighterIds);
  const live = await getCatalog();
  const tables = indexCatalog(live);
  const fighters = fighterIds
    .map((id) => tables.fightersById[id])
    .filter((fighter): fighter is Fighter => Boolean(fighter));
  const sync = await syncFighterSnapshots(fighters, triggerSource);
  return { recentCompleted: recent.length, ...sync };
}

/** Precompute official upcoming analyses only (not all hypothetical pairs). */
export async function jobPrecomputeUpcomingAnalyses(triggerSource = "cron:precompute") {
  const catalog = await getCatalog();
  const upcoming = getUpcomingFightViews(catalog);
  let generated = 0;
  let hits = 0;
  for (const view of upcoming) {
    const result = await analyzeFight(
      view.fighterA,
      view.fighterB,
      {
        rounds: view.fight.rounds,
        isTitle: view.fight.isTitle,
        division: view.fight.division,
      },
      { skipLlm: false, triggerSource },
    );
    if (result.cacheHit) hits += 1;
    else generated += 1;
  }
  await recordAnalysisRun({
    runType: "precompute",
    triggerSource,
    status: "succeeded",
    details: { upcoming: upcoming.length, generated, hits },
  });
  return { upcoming: upcoming.length, generated, hits };
}

export async function jobStaleAnalysisSweep(triggerSource = "cron:stale-sweep") {
  // Re-hash current catalog fighters; mark changed analyses stale; regenerate official upcoming only.
  const catalog = await getCatalog();
  const sync = await syncFighterSnapshots(catalog.fighters, triggerSource);
  const precompute = await jobPrecomputeUpcomingAnalyses(triggerSource);
  return { ...sync, ...precompute };
}

export type JobName =
  | "upcoming-events"
  | "weekly-roster"
  | "upcoming-fighters"
  | "near-7d"
  | "near-24h"
  | "post-event"
  | "precompute"
  | "stale-sweep";

export async function runScheduledJob(name: JobName, triggerSource?: string) {
  switch (name) {
    case "upcoming-events":
      return jobRefreshUpcomingEvents(triggerSource);
    case "weekly-roster":
      return jobWeeklyRosterRefresh(triggerSource);
    case "upcoming-fighters":
      return jobEnrichUpcomingFighters(triggerSource);
    case "near-7d":
      return jobNearTermRefresh({
        withinDays: 7,
        triggerSource: triggerSource ?? "cron:near-7d",
        enrichStats: true,
      });
    case "near-24h":
      return jobNearTermRefresh({
        withinDays: 1,
        triggerSource: triggerSource ?? "cron:near-24h",
        enrichStats: true,
      });
    case "post-event":
      return jobPostEventRefresh(triggerSource);
    case "precompute":
      return jobPrecomputeUpcomingAnalyses(triggerSource);
    case "stale-sweep":
      return jobStaleAnalysisSweep(triggerSource);
    default:
      throw new Error(`Unknown job ${name}`);
  }
}
