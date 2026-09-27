import { analyzeFightSync } from "@/server/analysis/engine";
import { deriveAttributes } from "@/server/analysis/attributes";
import { parseClockToMinutes, parsePair } from "@/server/analysis/stat-types";
import { parseFighterStatLogsFromHtml, aggregateLogs } from "@/server/mma/espn-fight-stats";
import type { Fighter } from "@/lib/types";
import { readFileSync } from "node:fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stubFighter(partial: Partial<Fighter> & Pick<Fighter, "id" | "name" | "lastName">): Fighter {
  const record = partial.record ?? { wins: 20, losses: 2, draws: 0 };
  const finishes = partial.finishes ?? {
    koTko: 8,
    koTkoLosses: 1,
    submissions: 3,
    submissionLosses: 0,
  };
  const recentFights = partial.recentFights ?? [
    {
      opponentName: "Test Opp",
      result: "W" as const,
      method: "Decision",
      round: 3,
      time: "5:00",
      date: "2025-01-01",
      eventName: "UFC",
    },
  ];
  const statistics = partial.statistics ?? {
    sigStrikesLandedPerMin: 4.2,
    sigStrikeAccuracy: 48,
    sigStrikesAbsorbedPerMin: 2.8,
    strikingDefense: 58,
    takedownsPer15: 1.4,
    takedownAccuracy: 42,
    takedownDefense: 70,
    submissionAttemptsPer15: 0.4,
    knockdownsPer15: 0.3,
  };
  const attributes =
    partial.attributes ??
    deriveAttributes({
      record,
      finishes,
      recentFights,
      age: partial.age ?? 30,
      ranking: partial.ranking ?? 5,
      statistics,
      splits: null,
    });

  return {
    id: partial.id,
    slug: partial.slug ?? partial.id,
    name: partial.name,
    firstName: partial.firstName ?? partial.name.split(" ")[0]!,
    lastName: partial.lastName,
    nickname: null,
    record,
    country: null,
    countryCode: null,
    division: partial.division ?? "Lightweight",
    ranking: partial.ranking ?? 5,
    age: partial.age ?? 30,
    heightCm: partial.heightCm ?? 178,
    reachCm: partial.reachCm ?? 180,
    stance: partial.stance ?? "Orthodox",
    portrait: { src: null, objectPosition: "50% 14%", status: "fallback" },
    attributes,
    statistics,
    finishes,
    recentFights,
    fightscopeScore: 70,
    sport: "mma",
  };
}

async function main() {
  assert(parseClockToMinutes(3, "2:30") === 12.5, "clock parse mid-round");
  assert(parseClockToMinutes(5, "5:00") === 25, "clock parse full 5");
  assert(parseClockToMinutes(2, "3:32") === 8.533333333333333 || Math.abs((parseClockToMinutes(2, "3:32") ?? 0) - (5 + 3 + 32 / 60)) < 0.001, "finish clock");
  assert(parsePair("12/40").landed === 12 && parsePair("12/40").attempted === 40, "pair parse");

  const html = `<html><script>window['__espnfitt__'] = ${JSON.stringify({
    page: {
      content: {
        player: {
          prtlCmnApiRsp: {
            eventsMap: {
              "s:3301~l:3321~e:1~c:99": {
                gameDate: "2025-01-01T00:00:00.000+00:00",
                gameResult: "W",
                opponent: { displayName: "Rival Fighter" },
                status: { displayClock: "5:00", period: 3 },
                titleFight: false,
              },
            },
          },
          stat: {
            tbl: [
              {
                ttl: "striking",
                col: [],
                row: [
                  [
                    { component: "Date", dte: "2025-01-01T00:00:00.000+00:00" },
                    { component: "Opponent", txt: "Rival Fighter", uid: "s:3301~a:2" },
                    { component: "Event", nm: "UFC" },
                    { component: "Fight", rslt: "W" },
                    "1/2",
                    "10/20",
                    "1/2",
                    "50",
                    "80",
                    "40",
                    "60",
                    "66.7%",
                    "1",
                    "20%",
                    "60%",
                    "20%",
                  ],
                ],
              },
              {
                ttl: "Clinch",
                col: [],
                row: [
                  [
                    { component: "Date", dte: "2025-01-01T00:00:00.000+00:00" },
                    { component: "Opponent", txt: "Rival Fighter", uid: "s:3301~a:2" },
                    { component: "Event", nm: "UFC" },
                    { component: "Fight", rslt: "W" },
                    "1",
                    "1",
                    "1",
                    "1",
                    "0",
                    "0",
                    "0",
                    "0",
                    "2",
                    "4",
                    "0",
                    "50%",
                  ],
                ],
              },
              {
                ttl: "Ground",
                col: [],
                row: [
                  [
                    { component: "Date", dte: "2025-01-01T00:00:00.000+00:00" },
                    { component: "Opponent", txt: "Rival Fighter", uid: "s:3301~a:2" },
                    { component: "Event", nm: "UFC" },
                    { component: "Fight", rslt: "W" },
                    "0",
                    "0",
                    "2",
                    "2",
                    "0",
                    "0",
                    "1",
                    "0",
                    "0",
                    "0",
                    "0",
                    "1",
                  ],
                ],
              },
            ],
          },
        },
      },
    },
  })};</script></html>`;

  const logs = parseFighterStatLogsFromHtml(html, "1");
  assert(logs.length === 1, "parsed one fight log");
  assert(logs[0]!.sigStrikesLanded === 40, "ssl parsed");
  assert(logs[0]!.minutes === 15, "minutes from 3x5:00");
  const agg = aggregateLogs(logs);
  assert(agg.statistics.sigStrikesLandedPerMin === 2.67, `slpm ${agg.statistics.sigStrikesLandedPerMin}`);
  assert(agg.statistics.takedownAccuracy === 50, "td accuracy");

  const a = stubFighter({ id: "a", name: "Alpha One", lastName: "One", ranking: 1 });
  const b = stubFighter({
    id: "b",
    name: "Beta Two",
    lastName: "Two",
    ranking: 12,
    statistics: {
      sigStrikesLandedPerMin: 2.1,
      sigStrikeAccuracy: 38,
      sigStrikesAbsorbedPerMin: 4.2,
      strikingDefense: 44,
      takedownsPer15: 0.2,
      takedownAccuracy: 20,
      takedownDefense: 50,
      submissionAttemptsPer15: 0.1,
      knockdownsPer15: 0.05,
    },
  });
  const prediction = analyzeFightSync(a, b, { rounds: 5, isTitle: true, division: "Lightweight" });
  assert(prediction.fighterAWinPct + prediction.fighterBWinPct === 100, "pct sum");
  assert(prediction.predictedWinnerId === a.id || prediction.predictedWinnerId === b.id, "pick");
  assert(prediction.methods.koTko + prediction.methods.decision + prediction.methods.submission === 100, "methods");

  // Optional live HTML parse smoke (non-fatal if offline)
  try {
    const live = await fetch("https://www.espn.com/mma/fighter/stats/_/id/3949584", {
      headers: { "User-Agent": "FightScope/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (live.ok) {
      const liveHtml = await live.text();
      const liveLogs = parseFighterStatLogsFromHtml(liveHtml, "3949584");
      console.log(JSON.stringify({ liveLogs: liveLogs.length, sampleMinutes: liveLogs[0]?.minutes ?? null }));
      assert(liveLogs.length > 5, "live volk logs");
    }
  } catch (error) {
    console.warn("Live ESPN smoke skipped", error);
  }

  // Snapshot should load
  const snap = JSON.parse(readFileSync(new URL("../mma/snapshot.json", import.meta.url), "utf8"));
  assert(Array.isArray(snap.fighters) && snap.fighters.length > 100, "snapshot fighters");

  console.log(
    JSON.stringify({
      ok: true,
      prediction: {
        a: prediction.fighterAWinPct,
        b: prediction.fighterBWinPct,
        pick: prediction.predictedWinnerId,
        confidence: prediction.confidence,
      },
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
