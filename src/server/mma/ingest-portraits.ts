import path from "node:path";
import { existsSync } from "node:fs";
import snapshot from "./snapshot.json";
import { PRESENTATION_ESPN_IDS } from "../../data/fighter-presentation";
import { fetchEspnCatalog } from "./espn";
import {
  cacheEspnHeadshot,
  cacheUfcHeadshot,
  cacheWikipediaHeadshot,
  portraitsDir,
  readExistingPortraitIndex,
  writePortraitArtifacts,
  type PortraitCoverageReport,
  type PortraitIndexEntry,
  type PortraitIndexFile,
} from "./portrait-pipeline";
import type { MmaCatalog } from "../../lib/types";

const CONCURRENCY = 10;

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
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function hasLocalFile(id: string): boolean {
  return existsSync(path.join(portraitsDir(), `${id}.png`));
}

async function main() {
  console.log("FightScope portraits: loading live ESPN catalog…");
  let live: MmaCatalog | null = null;
  try {
    live = await fetchEspnCatalog({ includeFightStats: false });
    console.log(`Live roster: ${live.fighters.length} fighters`);
  } catch (error) {
    console.warn("Live catalog failed; using snapshot only", error);
  }

  const snapshotCatalog = snapshot as MmaCatalog;
  const names = new Map<string, string>();
  const slugs = new Map<string, string>();
  const ids = new Set<string>();

  for (const catalog of [snapshotCatalog, live].filter(Boolean) as MmaCatalog[]) {
    for (const fighter of catalog.fighters) {
      ids.add(fighter.id);
      names.set(fighter.id, fighter.name);
      slugs.set(fighter.id, fighter.slug);
    }
  }
  for (const entry of PRESENTATION_ESPN_IDS) {
    ids.add(entry.espnId);
    if (!names.has(entry.espnId)) names.set(entry.espnId, entry.name);
  }

  const list = [...ids].filter((id) => {
    if (!/^\d+$/.test(id)) return false;
    const name = names.get(id) ?? "";
    return !/^(tba|to be announced|opponent tba)$/i.test(name.trim());
  });

  const previous = readExistingPortraitIndex();
  const index: PortraitIndexFile = {
    generatedAt: new Date().toISOString(),
    source: "espn-mma-headshot+ufc+wiki",
    entries: { ...(previous?.entries ?? {}) },
  };

  console.log(`FightScope portraits: resolving ${list.length} fighters`);

  await mapPool(list, CONCURRENCY, async (id) => {
    const existing = index.entries[id];
    if (existing?.status === "approved" && hasLocalFile(id)) {
      process.stdout.write(".");
      return;
    }

    const entry = await cacheEspnHeadshot(id, process.cwd(), { force: existing?.status === "missing" });
    index.entries[id] = entry;
    process.stdout.write(entry.status === "approved" ? "E" : "x");
  });
  process.stdout.write("\n");

  const missingAfterEspn = list.filter((id) => index.entries[id]?.status !== "approved" || !hasLocalFile(id));
  if (missingAfterEspn.length > 0) {
    console.log(`UFC fallback for ${missingAfterEspn.length} missing ESPN headshots`);
    await mapPool(missingAfterEspn, 4, async (id) => {
      const name = names.get(id);
      if (!name) return;
      const entry = await cacheUfcHeadshot(id, name, slugs.get(id));
      if (entry.status === "approved") {
        index.entries[id] = entry;
        process.stdout.write("U");
      } else {
        process.stdout.write("x");
      }
    });
    process.stdout.write("\n");
  }

  const stillMissing = list.filter((id) => index.entries[id]?.status !== "approved" || !hasLocalFile(id));
  if (stillMissing.length > 0) {
    console.log(`Wikipedia MMA fallback for ${stillMissing.length} unresolved`);
    await mapPool(stillMissing, 3, async (id) => {
      const name = names.get(id);
      if (!name) return;
      const entry = await cacheWikipediaHeadshot(id, name);
      if (entry.status === "approved") {
        index.entries[id] = entry;
        process.stdout.write("W");
      } else {
        index.entries[id] = index.entries[id] ?? entry;
        process.stdout.write("x");
      }
    });
    process.stdout.write("\n");
  }

  // Keep index scoped to current roster + curated IDs, but never drop approved files' metadata
  // for fighters still on roster.
  const rosterSet = new Set(list);
  const pruned: Record<string, PortraitIndexEntry> = {};
  for (const id of list) {
    const entry = index.entries[id];
    if (entry) pruned[id] = entry;
    else if (hasLocalFile(id)) {
      pruned[id] = {
        src: `/portraits/espn/${id}.png`,
        status: "approved",
        source: "espn-headshot",
      };
    } else {
      pruned[id] = {
        src: `/portraits/espn/${id}.png`,
        status: "missing",
        source: "espn-headshot",
        reason: "unresolved",
      };
    }
  }
  // Preserve curated extras not on roster
  for (const [id, entry] of Object.entries(index.entries)) {
    if (!rosterSet.has(id) && entry.status === "approved") pruned[id] = entry;
  }
  index.entries = pruned;

  const unresolved = Object.entries(index.entries)
    .filter(([id, entry]) => rosterSet.has(id) && entry.status !== "approved")
    .map(([id, entry]) => ({
      id,
      name: names.get(id),
      reason: entry.reason ?? entry.status,
    }))
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));

  const coverage: PortraitCoverageReport = {
    generatedAt: index.generatedAt,
    roster: list.length,
    approved: list.filter((id) => index.entries[id]?.status === "approved" && hasLocalFile(id)).length,
    rejected: list.filter((id) => index.entries[id]?.status === "rejected").length,
    missing: unresolved.length,
    unresolved,
  };

  writePortraitArtifacts(index, coverage);
  console.log(
    JSON.stringify(
      {
        roster: coverage.roster,
        approved: coverage.approved,
        rejected: coverage.rejected,
        missing: coverage.missing,
        unresolvedNames: unresolved.map((item) => item.name ?? item.id),
        out: path.join("src", "data", "portrait-coverage.json"),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
