import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deriveAttributes, fightscopeScoreFromAttributes } from "@/server/analysis/attributes";
import {
  applyOpponentFacingStats,
  buildStatBundle,
  fetchFighterStatLogs,
} from "@/server/mma/espn-fight-stats";
import type { FighterStatBundle } from "@/server/analysis/stat-types";
import type { MmaCatalog } from "@/lib/types";

/**
 * Enrich existing snapshot.json with ESPN fight-stat rates for upcoming + featured fighters.
 * Faster than a full catalog rebuild.
 */
async function mapPool<T>(items: T[], limit: number, mapper: (item: T) => Promise<void>) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      await mapper(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

async function main() {
  const snapPath = path.join(import.meta.dirname, "../mma/snapshot.json");
  const catalog = JSON.parse(readFileSync(snapPath, "utf8")) as MmaCatalog;
  const upcomingIds = new Set<string>();
  for (const fight of catalog.fights) {
    if (fight.status !== "upcoming") continue;
    upcomingIds.add(fight.fighterAId);
    upcomingIds.add(fight.fighterBId);
  }
  if (catalog.featuredFightId) {
    const featured = catalog.fights.find((fight) => fight.id === catalog.featuredFightId);
    if (featured) {
      upcomingIds.add(featured.fighterAId);
      upcomingIds.add(featured.fighterBId);
    }
  }

  const targets = catalog.fighters.filter((fighter) => upcomingIds.has(fighter.id) && /^\d+$/.test(fighter.id));
  console.log(`Enriching ${targets.length} upcoming fighters with ESPN fight stats…`);

  const bundles = new Map<string, FighterStatBundle>();
  await mapPool(targets, 4, async (fighter) => {
    try {
      const logs = await fetchFighterStatLogs(fighter.id);
      if (!logs.length) {
        console.log(`  no logs ${fighter.name}`);
        return;
      }
      bundles.set(fighter.id, buildStatBundle(fighter.id, logs));
      console.log(`  ok ${fighter.name} fights=${logs.length}`);
    } catch (error) {
      console.error(`  fail ${fighter.name}`, error);
    }
  });

  applyOpponentFacingStats(bundles);

  catalog.fighters = catalog.fighters.map((fighter) => {
    const bundle = bundles.get(fighter.id);
    if (!bundle) {
      const attributes = deriveAttributes({
        record: fighter.record,
        finishes: fighter.finishes,
        recentFights: fighter.recentFights,
        age: fighter.age,
        ranking: fighter.ranking,
        statistics: fighter.statistics,
        splits: fighter.statSplits ?? null,
      });
      return { ...fighter, attributes, fightscopeScore: fightscopeScoreFromAttributes(attributes) };
    }
    const attributes = deriveAttributes({
      record: fighter.record,
      finishes: fighter.finishes,
      recentFights: fighter.recentFights,
      age: fighter.age,
      ranking: fighter.ranking,
      statistics: bundle.statistics,
      splits: bundle.splits,
    });
    return {
      ...fighter,
      statistics: bundle.statistics,
      statSplits: bundle.splits,
      attributes,
      fightscopeScore: fightscopeScoreFromAttributes(attributes),
    };
  });
  catalog.lastUpdated = new Date().toISOString();
  writeFileSync(snapPath, JSON.stringify(catalog));
  console.log(
    JSON.stringify({
      enriched: bundles.size,
      fighters: catalog.fighters.length,
      lastUpdated: catalog.lastUpdated,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
