import { writeFileSync } from "node:fs";
import path from "node:path";
import { fetchEspnCatalog } from "./espn";

async function main() {
  const includeFightStats = process.env.FIGHTSCOPE_SKIP_FIGHT_STATS !== "1";
  console.log(`FightScope refresh: includeFightStats=${includeFightStats}`);
  const catalog = await fetchEspnCatalog({
    includeFightStats,
    fightStatsConcurrency: Number(process.env.FIGHTSCOPE_STATS_CONCURRENCY ?? 4),
  });
  const out = path.join(import.meta.dirname, "snapshot.json");
  writeFileSync(out, JSON.stringify(catalog));

  const withRates = catalog.fighters.filter((fighter) =>
    Object.values(fighter.statistics).some((value) => value != null),
  ).length;

  console.log(
    JSON.stringify({
      fighters: catalog.fighters.length,
      fightersWithRates: withRates,
      events: catalog.events.length,
      fights: catalog.fights.length,
      featuredEventId: catalog.featuredEventId,
      lastUpdated: catalog.lastUpdated,
      includeFightStats,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
