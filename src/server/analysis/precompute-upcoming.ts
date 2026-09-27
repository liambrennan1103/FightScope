import { analyzeFight } from "@/server/analysis/engine";
import { getCatalog, getUpcomingFightViews } from "@/server/mma/store";

/**
 * Precompute + cache FightScope analyses for upcoming card fights.
 */
async function main() {
  const catalog = await getCatalog();
  const upcoming = getUpcomingFightViews(catalog).slice(0, 40);
  let ok = 0;
  for (const view of upcoming) {
    const result = await analyzeFight(
      view.fighterA,
      view.fighterB,
      {
        rounds: view.fight.rounds,
        isTitle: view.fight.isTitle,
        division: view.fight.division,
      },
      { skipLlm: true },
    );
    ok += 1;
    console.log(
      `${view.fighterA.lastName} vs ${view.fighterB.lastName}: ${result.prediction.fighterAWinPct}-${result.prediction.fighterBWinPct} cache=${result.cacheHit}`,
    );
  }
  console.log(JSON.stringify({ precomputed: ok }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
