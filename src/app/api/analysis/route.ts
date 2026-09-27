import { NextResponse } from "next/server";
import type { ProAnalysisPayload } from "@/lib/analysis-payload";
import { analyzeFight } from "@/server/analysis/engine";
import { analyzeFightStarter } from "@/server/analysis/starter-engine";
import { hasAnthropicApiKey } from "@/server/analysis/anthropic";
import {
  canGenerateAnalysis,
  resolveAnalysisPlan,
} from "@/server/entitlements";
import { getCatalog, indexCatalog } from "@/server/mma/store";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8_192;
const inFlight = new Map<string, number>();
const IN_FLIGHT_TTL_MS = 25_000;

function pruneInFlight(now: number) {
  for (const [key, started] of inFlight) {
    if (now - started > IN_FLIGHT_TTL_MS) inFlight.delete(key);
  }
}

export async function POST(request: Request) {
  try {
    const plan = await resolveAnalysisPlan();
    if (!canGenerateAnalysis(plan)) {
      return NextResponse.json(
        {
          error: "Analyze Fight requires a Starter or Pro plan.",
          code: "PLAN_REQUIRED",
          plan,
        },
        { status: 402 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }

    const body = (await request.json()) as {
      fighterAId?: string;
      fighterBId?: string;
      rounds?: 3 | 5;
      isTitle?: boolean;
      division?: string | null;
      bypassCache?: boolean;
    };

    if (
      typeof body.fighterAId !== "string" ||
      typeof body.fighterBId !== "string" ||
      !body.fighterAId.trim() ||
      !body.fighterBId.trim() ||
      body.fighterAId === body.fighterBId ||
      body.fighterAId.length > 64 ||
      body.fighterBId.length > 64
    ) {
      return NextResponse.json({ error: "Two distinct fighters are required." }, { status: 400 });
    }

    if (body.rounds != null && body.rounds !== 3 && body.rounds !== 5) {
      return NextResponse.json({ error: "Invalid rounds value." }, { status: 400 });
    }

    if (body.division != null && (typeof body.division !== "string" || body.division.length > 64)) {
      return NextResponse.json({ error: "Invalid division value." }, { status: 400 });
    }

    const now = Date.now();
    pruneInFlight(now);
    const flightKey = `${plan}:${body.fighterAId}:${body.fighterBId}:${body.rounds === 5 ? 5 : 3}:${Boolean(body.isTitle)}`;
    if (inFlight.has(flightKey)) {
      return NextResponse.json(
        { error: "Analysis already in progress for this matchup." },
        { status: 429 },
      );
    }
    inFlight.set(flightKey, now);

    try {
      const catalog = await getCatalog();
      const tables = indexCatalog(catalog);
      const fighterA = tables.fightersById[body.fighterAId];
      const fighterB = tables.fightersById[body.fighterBId];
      if (!fighterA || !fighterB) {
        return NextResponse.json({ error: "Fighter not found." }, { status: 404 });
      }

      const context = {
        rounds: (body.rounds === 5 ? 5 : 3) as 3 | 5,
        isTitle: Boolean(body.isTitle),
        division: body.division ?? fighterA.division ?? fighterB.division ?? null,
      };

      if (plan === "starter") {
        const result = await analyzeFightStarter(fighterA, fighterB, context, {
          bypassCache: Boolean(body.bypassCache),
        });
        const a = result.analysis.fighterAWinPct;
        const b = result.analysis.fighterBWinPct;
        const d = result.analysis.drawPct;
        if (a + b + d !== 100) {
          // Tolerate rare rounding; only reject hard failures
          const sum = a + b + d;
          if (sum < 98 || sum > 102) {
            console.error("FightScope starter analysis returned non-normalized percentages", {
              a,
              b,
              d,
            });
            return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
          }
        }
        // Starter response: ONLY starter fields — no Pro prediction object.
        return NextResponse.json({
          plan: "starter",
          analysis: result.analysis,
          cacheHit: result.cacheHit,
          explanationSource: result.explanationSource,
          engineVersion: result.engineVersion,
          dataQuality: result.dataQuality,
          aiConfigured: hasAnthropicApiKey(),
        });
      }

      const result = await analyzeFight(fighterA, fighterB, context, {
        bypassCache: Boolean(body.bypassCache),
        triggerSource: "api",
      });

      const aPct = result.prediction.fighterAWinPct;
      const bPct = result.prediction.fighterBWinPct;
      const drawPct = result.prediction.jointOutcomes?.draw ?? 0;
      const total = aPct + bPct + drawPct;
      // Engine v3 allocates draw separately — A + B + Draw must ≈ 100.
      if (total < 98 || total > 102) {
        console.error("FightScope analysis returned non-normalized percentages", {
          aPct,
          bPct,
          drawPct,
          total,
        });
        return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
      }

      const keyMatchupFactors = [
        ...result.prediction.keyAdvantages.fighterA.slice(0, 2),
        ...result.prediction.keyAdvantages.fighterB.slice(0, 2),
      ].slice(0, 5);

      const analysis: ProAnalysisPayload = {
        tier: "pro",
        prediction: result.prediction,
        drawPct,
        keyMatchupFactors:
          keyMatchupFactors.length >= 3
            ? keyMatchupFactors
            : ["Striking efficiency", "Grappling threat", "Defensive reliability"],
        fightscopeRating: Math.round(
          (fighterA.fightscopeScore + fighterB.fightscopeScore) / 2,
        ),
      };

      return NextResponse.json({
        plan: "pro",
        analysis,
        cacheHit: result.cacheHit,
        explanationSource: result.explanationSource,
        engineVersion: result.engineVersion,
        dataQuality: result.dataQuality,
        persistence: result.persistence,
        aiConfigured: hasAnthropicApiKey(),
      });
    } finally {
      inFlight.delete(flightKey);
    }
  } catch (error) {
    console.error("FightScope analysis API failed", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}
