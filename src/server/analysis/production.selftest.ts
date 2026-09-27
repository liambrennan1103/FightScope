import { analyzeFight } from "@/server/analysis/engine";
import {
  ANALYSIS_ENGINE_VERSION,
  analysisCacheKey,
  combinedInputHash,
  fighterFingerprint,
} from "@/server/analysis/cache";
import { assessDataQuality } from "@/server/analysis/data-quality";
import { flagExtremeConfidence } from "@/server/prediction/extreme-confidence";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/server/supabase/client";
import type { Fighter } from "@/lib/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stub(partial: Partial<Fighter> & Pick<Fighter, "id" | "name" | "lastName">): Fighter {
  const statistics = partial.statistics ?? {
    sigStrikesLandedPerMin: 4,
    sigStrikeAccuracy: 50,
    sigStrikesAbsorbedPerMin: 3,
    strikingDefense: 55,
    takedownsPer15: 1,
    takedownAccuracy: 40,
    takedownDefense: 60,
    submissionAttemptsPer15: 0.2,
    knockdownsPer15: 0.2,
  };
  return {
    id: partial.id,
    slug: partial.slug ?? partial.id,
    name: partial.name,
    firstName: partial.firstName ?? "Test",
    lastName: partial.lastName,
    nickname: null,
    record: partial.record ?? { wins: 15, losses: 3, draws: 0 },
    country: null,
    countryCode: null,
    division: "Welterweight",
    ranking: partial.ranking ?? 4,
    age: 29,
    heightCm: 180,
    reachCm: 185,
    stance: "Orthodox",
    portrait: { src: null, objectPosition: "50% 14%", status: "fallback" },
    attributes: partial.attributes ?? {
      striking: 70,
      power: 68,
      wrestling: 66,
      grappling: 64,
      cardio: 72,
      defense: 69,
      durability: 71,
      experience: 75,
      recentForm: 70,
    },
    statistics,
    finishes: { koTko: 5, koTkoLosses: 1, submissions: 2, submissionLosses: 0 },
    recentFights: [
      {
        opponentName: "Opp",
        result: "W",
        method: "DEC",
        round: 3,
        time: "5:00",
        date: "2025-06-01",
        eventName: "UFC",
      },
    ],
    fightscopeScore: 70,
    sport: "mma",
  };
}

async function main() {
  const a = stub({ id: "prod-a", name: "Prod Alpha", lastName: "Alpha" });
  const b = stub({ id: "prod-b", name: "Prod Beta", lastName: "Beta", ranking: 10 });

  assert(assessDataQuality(a, b) === "HIGH", "quality high with rates");
  const low = stub({
    id: "prod-low",
    name: "Low Data",
    lastName: "Low",
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
  assert(assessDataQuality(low, low) === "LOW", "quality low without rates");

  // C: reverse order same canonical key
  const keyAB = analysisCacheKey(a.id, b.id, 3, false);
  const keyBA = analysisCacheKey(b.id, a.id, 3, false);
  assert(keyAB === keyBA, "canonical matchup key");

  // Local generation path (always works)
  const first = await analyzeFight(a, b, { rounds: 3, isTitle: false, division: null }, {
    skipLlm: true,
    triggerSource: "selftest",
  });
  assert(first.prediction.fighterAWinPct + first.prediction.fighterBWinPct === 100, "pct");
  assert(first.dataQuality === "HIGH", "result quality");

  const second = await analyzeFight(a, b, { rounds: 3, isTitle: false, division: null }, {
    skipLlm: true,
    triggerSource: "selftest",
  });
  assert(second.cacheHit === true, "disk/supabase cache hit on second request");
  assert(second.prediction.fighterAWinPct === first.prediction.fighterAWinPct, "stable pct");

  const reversed = await analyzeFight(b, a, { rounds: 3, isTitle: false, division: null }, {
    skipLlm: true,
    triggerSource: "selftest",
  });
  assert(reversed.cacheHit === true, "reverse order cache hit");
  assert(reversed.prediction.fighterAWinPct === first.prediction.fighterBWinPct, "mirrored A");
  assert(reversed.prediction.fighterBWinPct === first.prediction.fighterAWinPct, "mirrored B");

  // D: hash change after prediction-relevant edit
  const mutated = stub({
    id: "prod-a",
    name: "Prod Alpha",
    lastName: "Alpha",
    statistics: {
      ...a.statistics,
      sigStrikesLandedPerMin: 6.5,
    },
  });
  assert(fighterFingerprint(mutated) !== fighterFingerprint(a), "fingerprint changes");
  assert(
    combinedInputHash(mutated, b, 3, false) !== combinedInputHash(a, b, 3, false),
    "input hash changes",
  );
  const regenerated = await analyzeFight(mutated, b, { rounds: 3, isTitle: false, division: null }, {
    skipLlm: true,
    triggerSource: "selftest",
  });
  assert(regenerated.cacheHit === false, "stale hash forces regenerate");

  // H: LLM skip still stores structured prediction
  assert(Boolean(regenerated.prediction.methods.koTko), "structured methods remain");

  // F: concurrent claims (Supabase only)
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const x = stub({ id: `conc-x-${Date.now()}`, name: "Conc X", lastName: "X" });
    const y = stub({ id: `conc-y-${Date.now()}`, name: "Conc Y", lastName: "Y", ranking: 8 });
    const [r1, r2] = await Promise.all([
      analyzeFight(x, y, { rounds: 3, isTitle: false, division: null }, { skipLlm: true, triggerSource: "conc" }),
      analyzeFight(x, y, { rounds: 3, isTitle: false, division: null }, { skipLlm: true, triggerSource: "conc" }),
    ]);
    assert(r1.prediction.fighterAWinPct === r2.prediction.fighterAWinPct, "concurrent same pct");
    const key = analysisCacheKey(x.id, y.id, 3, false);
    const { data, error } = await supabase
      .from("fight_analyses")
      .select("id,status")
      .eq("matchup_key", key)
      .eq("engine_version", ANALYSIS_ENGINE_VERSION);
    assert(!error, "supabase select ok");
    assert((data?.length ?? 0) === 1, "single row for concurrent matchup");
    assert(data?.[0]?.status === "ready", "row ready");
    console.log(JSON.stringify({ supabaseConcurrency: "ok", rows: data?.length }));
  } else {
    console.log(JSON.stringify({ supabaseConcurrency: "skipped-no-env" }));
  }

  console.log(
    JSON.stringify({
      ok: true,
      engine: ANALYSIS_ENGINE_VERSION,
      supabaseConfigured: isSupabaseConfigured(),
      firstPersistence: first.persistence,
      secondHit: second.cacheHit,
      reverseHit: reversed.cacheHit,
      extremeConfidence: flagExtremeConfidence(
        first.prediction.fighterAWinPct,
        first.prediction.fighterBWinPct,
      ),
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
