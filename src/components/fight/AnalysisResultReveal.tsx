"use client";

import { useId, useMemo, useState } from "react";
import { ProLockedModules } from "@/components/premium/ProLockedModules";
import { cn } from "@/lib/cn";
import {
  buildCoverageChecklist,
  edgeMagnitudeLabel,
  impactLabelFromMagnitude,
  methodSharesFromJoint,
  selectTopWhyFactors,
} from "@/lib/analysis-metrics";
import { sanitizeAnalysisCopy } from "@/lib/analysis-copy";
import type { ClientAnalysis } from "@/lib/analysis-payload";
import { routes } from "@/lib/routes";
import type { Fighter } from "@/lib/types";
import { FighterComparisonMatrix } from "@/components/fight/FighterComparisonMatrix";
import { AnalysisSectionNav } from "@/components/fight/AnalysisSectionNav";

export function AnalysisResultReveal({
  fighterA,
  fighterB,
  analysis,
  historical = false,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  analysis: ClientAnalysis;
  historical?: boolean;
}) {
  const isPro = analysis.tier === "pro";
  const predictedA = analysis.predictedWinnerId === fighterA.id;
  const winner = predictedA ? fighterA : fighterB;
  const winnerPct = predictedA ? analysis.fighterAWinPct : analysis.fighterBWinPct;
  const loser = predictedA ? fighterB : fighterA;
  const engine = analysis.engine;

  const allFactors = selectTopWhyFactors(
    {
      fighterAWinPct: analysis.fighterAWinPct,
      fighterBWinPct: analysis.fighterBWinPct,
      predictedWinnerId: analysis.predictedWinnerId,
      confidence: analysis.confidence,
      methods: engine.methods,
      topFactors: engine.topFactors,
      jointOutcomes: engine.jointOutcomes,
      mostLikelyPath: engine.mostLikelyPath,
      analysis: { fightscopeRead: "", howAWins: "", howBWins: "" },
      keyAdvantages: { fighterA: [], fighterB: [] },
    },
    5,
  );

  const methodDist = methodSharesFromJoint(engine.jointOutcomes, engine.methods);
  const edgeSentence = sanitizeAnalysisCopy(
    analysis.shortRead ||
      `${winner.name} holds the FightScope edge at ${winnerPct}%.`,
  );

  const howA = analysis.prediction?.analysis.howAWins
    ? sanitizeAnalysisCopy(analysis.prediction.analysis.howAWins)
    : null;
  const howB = analysis.prediction?.analysis.howBWins
    ? sanitizeAnalysisCopy(analysis.prediction.analysis.howBWins)
    : null;

  const coverageLevel =
    engine.coverageLevel ??
    (analysis.prediction?.coverageLevel as "HIGH" | "MEDIUM" | "LOW" | undefined) ??
    "MEDIUM";

  return (
    <div className="space-y-14 sm:space-y-16">
      <AnalysisSectionNav />

      {historical ? (
        <p className="text-center text-[11px] text-mute">
          Original pre-fight FightScope prediction — frozen archive
        </p>
      ) : null}

      {/* LEVEL 1 — compact overview (board already shows big %s) */}
      <section
        id="analysis-overview"
        className="scroll-mt-[var(--fs-scroll-margin,5.5rem)] space-y-5 border-b border-white/[0.06] pb-10"
      >
        <div className="text-center sm:text-left">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
            FightScope prediction — {winner.lastName}
          </p>
          <p className="mt-2 font-mono text-[15px] text-mute sm:text-base">
            <span className="text-ink">{analysis.fighterAWinPct}%</span> {fighterA.lastName}
            <span className="mx-2 text-mute/50">·</span>
            <span className="text-ink">{analysis.drawPct}%</span> Draw
            <span className="mx-2 text-mute/50">·</span>
            <span className="text-ink">{analysis.fighterBWinPct}%</span> {fighterB.lastName}
          </p>
        </div>
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
            Predicted edge
          </p>
          <p className="mt-2 text-[15px] leading-7 text-ink/90">{edgeSentence}</p>
          <div className="mt-4">
            <DataCoverageChip
              level={coverageLevel}
              fighterA={fighterA}
              fighterB={fighterB}
              reasons={engine.coverageReasons}
            />
          </div>
        </div>
      </section>

      {/* LEVEL 2 — Why (top 3) */}
      <WhyFightScopeLeans
        winner={winner}
        fighterA={fighterA}
        fighterB={fighterB}
        factors={allFactors}
        keyLabels={analysis.keyMatchupFactors}
      />

      {/* LEVEL 3 — Evidence */}
      <FighterComparisonMatrix
        fighterA={fighterA}
        fighterB={fighterB}
        topFactors={allFactors}
      />

      {/* LEVEL 4 — Deep */}
      <MethodVictorySection
        fighterA={fighterA}
        fighterB={fighterB}
        methodDist={methodDist}
        aggregate={engine.methods}
        mostLikely={engine.mostLikelyPath}
      />

      <FightScenariosSection
        fighterA={fighterA}
        fighterB={fighterB}
        winner={winner}
        loser={loser}
        methodDist={methodDist}
      />

      <PathsAndRisks
        fighterA={fighterA}
        fighterB={fighterB}
        winner={winner}
        loser={loser}
        howA={howA}
        howB={howB}
        isPro={isPro}
        methodDist={methodDist}
      />

      {isPro && analysis.prediction ? (
        <section id="analysis-deep" className="scroll-mt-[var(--fs-scroll-margin,5.5rem)] space-y-4 border-t border-white/[0.06] pt-10">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
            Deep analysis
          </p>
          <p className="max-w-3xl text-[15px] leading-7 text-mute">
            {sanitizeAnalysisCopy(analysis.prediction.analysis.fightscopeRead)}
          </p>
          {analysis.fightscopeRating != null ? (
            <p className="text-[13px] text-mute">
              FightScope Rating{" "}
              <span className="font-mono text-ink">{analysis.fightscopeRating}</span>
            </p>
          ) : null}
        </section>
      ) : !isPro ? (
        <div className="border-t border-white/[0.06] pt-10">
          <ProLockedModules />
        </div>
      ) : null}

      <DataSourcesSection
        fighterA={fighterA}
        fighterB={fighterB}
        coverageLevel={coverageLevel}
        modelVersion={engine.modelVersion}
        featureVersion={engine.featureVersion}
      />
    </div>
  );
}

function WhyFightScopeLeans({
  winner,
  fighterA,
  fighterB,
  factors,
  keyLabels,
}: {
  winner: Fighter;
  fighterA: Fighter;
  fighterB: Fighter;
  factors: ReturnType<typeof selectTopWhyFactors>;
  keyLabels: string[];
}) {
  const [showMore, setShowMore] = useState(false);
  const panelId = useId();

  const items =
    factors.length > 0
      ? factors.map((f, i) => {
          const edgeFighter =
            f.edge === "fighterA" ? fighterA : f.edge === "fighterB" ? fighterB : winner;
          return {
            id: `${f.factor}-${i}`,
            title: f.label,
            edge: edgeFighter.lastName,
            body: factorEvidenceLine(f.factor, fighterA, fighterB, edgeFighter),
            impact: impactLabelFromMagnitude(f.magnitude),
          };
        })
      : keyLabels.slice(0, 5).map((label, i) => ({
          id: `label-${i}`,
          title: label,
          edge: winner.lastName,
          body: `Cited in FightScope’s matchup read for ${winner.lastName}.`,
          impact: "moderate" as const,
        }));

  const visible = showMore ? items : items.slice(0, 3);
  const extra = Math.max(0, items.length - 3);

  return (
    <section id="analysis-why" className="scroll-mt-[var(--fs-scroll-margin,5.5rem)] space-y-5">
      <div>
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
          Why FightScope leans {winner.lastName}
        </h2>
        <p className="mt-1 text-[13px] text-mute">
          Top model contributions — ordered by structural impact.
        </p>
      </div>
      <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {visible.map((item, index) => (
          <li
            key={item.id}
            className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:gap-4"
          >
            <span className="font-mono text-sm text-mute/70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-ink uppercase">{item.title}</p>
              <p className="mt-1 text-[12px] text-mute">
                Edge: <span className="text-ink">{item.edge}</span>
                <span className="mx-2 text-mute/40">·</span>
                Model impact:{" "}
                <span className="text-accent">{edgeMagnitudeLabel(item.impact)}</span>
              </p>
              <p className="mt-2 text-[14px] leading-6 text-mute">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
      {extra > 0 ? (
        <button
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-4 py-2.5 text-[11px] font-semibold tracking-[0.1em] text-ink uppercase transition-colors hover:border-accent/50 hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          aria-controls={panelId}
        >
          {showMore ? "Collapse" : `View all ${items.length}`}
          <span
            className={cn(
              "inline-block text-accent transition-transform duration-300",
              showMore && "rotate-180",
            )}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>
      ) : null}
      <div id={panelId} className="sr-only" aria-hidden="true" />
    </section>
  );
}

function factorEvidenceLine(
  factor: string,
  fighterA: Fighter,
  fighterB: Fighter,
  edgeFighter: Fighter,
): string {
  const key = factor.toLowerCase();
  if (key.includes("reach") && fighterA.reachCm != null && fighterB.reachCm != null) {
    return `${fighterA.lastName} ${fighterA.reachCm} cm vs ${fighterB.lastName} ${fighterB.reachCm} cm.`;
  }
  if (key.includes("takedown") && key.includes("def")) {
    const a = fighterA.statistics.takedownDefense;
    const b = fighterB.statistics.takedownDefense;
    if (a != null && b != null) return `${fighterA.lastName} ${a}% vs ${fighterB.lastName} ${b}% TD defense.`;
  }
  if (key.includes("strik") && key.includes("def")) {
    const a = fighterA.statistics.strikingDefense;
    const b = fighterB.statistics.strikingDefense;
    if (a != null && b != null) return `${fighterA.lastName} ${a}% vs ${fighterB.lastName} ${b}% striking defense.`;
  }
  if (key.includes("output") || (key.includes("strik") && !key.includes("def"))) {
    const a = fighterA.statistics.sigStrikesLandedPerMin;
    const b = fighterB.statistics.sigStrikesLandedPerMin;
    if (a != null && b != null) {
      return `${fighterA.lastName} ${a.toFixed(2)} SLpM vs ${fighterB.lastName} ${b.toFixed(2)} SLpM.`;
    }
  }
  if (key.includes("takedown") && !key.includes("def")) {
    const a = fighterA.statistics.takedownsPer15;
    const b = fighterB.statistics.takedownsPer15;
    if (a != null && b != null) {
      return `${fighterA.lastName} ${a.toFixed(2)} TD/15 vs ${fighterB.lastName} ${b.toFixed(2)} TD/15.`;
    }
  }
  if (key.includes("ko")) {
    const aw = fighterA.record.wins;
    const bw = fighterB.record.wins;
    const ako = fighterA.finishes.koTko;
    const bko = fighterB.finishes.koTko;
    if (aw > 0 && bw > 0 && ako != null && bko != null) {
      return `${fighterA.lastName} ${Math.round((ako / aw) * 100)}% KO/TKO wins vs ${fighterB.lastName} ${Math.round((bko / bw) * 100)}%.`;
    }
  }
  if (key.includes("sub")) {
    const aw = fighterA.record.wins;
    const bw = fighterB.record.wins;
    const asub = fighterA.finishes.submissions;
    const bsub = fighterB.finishes.submissions;
    if (aw > 0 && bw > 0 && asub != null && bsub != null) {
      return `${fighterA.lastName} ${Math.round((asub / aw) * 100)}% submission wins vs ${fighterB.lastName} ${Math.round((bsub / bw) * 100)}%.`;
    }
  }
  if (key.includes("age") && fighterA.age != null && fighterB.age != null) {
    return `${fighterA.lastName} ${fighterA.age} vs ${fighterB.lastName} ${fighterB.age}.`;
  }
  return `${edgeFighter.lastName} holds this factor in the structural model ranking.`;
}

function MethodVictorySection({
  fighterA,
  fighterB,
  methodDist,
  aggregate,
  mostLikely,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  methodDist: ReturnType<typeof methodSharesFromJoint>;
  aggregate: ClientAnalysis["engine"]["methods"];
  mostLikely: ClientAnalysis["engine"]["mostLikelyPath"];
}) {
  const hasJoint = Boolean(methodDist);
  const hasAgg =
    aggregate &&
    (aggregate.koTko > 0 || aggregate.decision > 0 || aggregate.submission > 0);
  if (!hasJoint && !hasAgg) return null;

  const summary = methodDist ? methodTendencySummary(methodDist) : null;

  return (
    <section id="analysis-method" className="scroll-mt-[var(--fs-scroll-margin,5.5rem)] space-y-6">
      <div>
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
          Method of victory
        </h2>
        {summary ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-ink/90">{summary}</p>
        ) : (
          <p className="mt-1 text-[13px] text-mute">
            Joint outcome distribution from the prediction engine.
          </p>
        )}
      </div>

      {methodDist ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <MethodFighterBlock name={fighterA.name} methods={methodDist.a} />
          <MethodFighterBlock name={fighterB.name} methods={methodDist.b} />
        </div>
      ) : hasAgg ? (
        <MethodBars
          rows={[
            { label: "KO/TKO", value: aggregate.koTko },
            { label: "Submission", value: aggregate.submission },
            { label: "Decision", value: aggregate.decision },
          ]}
        />
      ) : null}

      {methodDist && methodDist.draw > 0 ? (
        <p className="text-center text-[13px] text-mute">
          Draw <span className="font-mono text-ink">{methodDist.draw}%</span>
        </p>
      ) : null}

      {methodDist ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCallout label="Ends inside the distance" value={`${methodDist.finishPct}%`} />
          <StatCallout label="Goes to decision" value={`${methodDist.decisionPct}%`} />
        </div>
      ) : null}

      {mostLikely && mostLikely.pct > 0 ? (
        <div className="border border-white/[0.08] px-5 py-4 text-center">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
            Most likely individual outcome
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {mostLikely.label}{" "}
            <span className="font-mono text-accent">{mostLikely.pct}%</span>
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** Deterministic copy from finish vs decision share — never contradicts the model. */
function methodTendencySummary(
  methodDist: NonNullable<ReturnType<typeof methodSharesFromJoint>>,
): string {
  const { finishPct, decisionPct } = methodDist;
  if (decisionPct >= finishPct + 8) {
    return "FightScope expects this matchup to reach the judges more often than produce a finish.";
  }
  if (finishPct >= decisionPct + 8) {
    return "FightScope sees an inside-the-distance result as more likely than a decision.";
  }
  return "FightScope sees finish and decision paths as closely contested.";
}

function MethodFighterBlock({
  name,
  methods,
}: {
  name: string;
  methods: { koTko: number; submission: number; decision: number };
}) {
  return (
    <div className="space-y-3 border border-white/[0.06] px-4 py-4">
      <p className="text-sm font-semibold text-ink">{name}</p>
      <MethodBars
        rows={[
          { label: "KO/TKO", value: methods.koTko },
          { label: "Submission", value: methods.submission },
          { label: "Decision", value: methods.decision },
        ]}
      />
    </div>
  );
}

function MethodBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.75rem] items-center gap-2">
          <span className="text-[12px] text-mute">{row.label}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-accent/80 transition-[width] duration-700 ease-out"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className="text-right font-mono text-[12px] text-ink">{row.value}%</span>
        </li>
      ))}
    </ul>
  );
}

function StatCallout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.06] px-4 py-4 text-center">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-mute uppercase">{label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function FightScenariosSection({
  fighterA,
  fighterB,
  winner,
  loser,
  methodDist,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  winner: Fighter;
  loser: Fighter;
  methodDist: ReturnType<typeof methodSharesFromJoint>;
}) {
  const aTd = fighterA.statistics.takedownDefense;
  const bTd = fighterB.statistics.takedownDefense;

  const scenarios = [
    {
      title: `${winner.lastName} controls the pace`,
      favours: winner.lastName,
      trigger: "Preferred range + defensive discipline",
      route: methodDist && methodDist.decisionPct >= methodDist.finishPct
        ? "Attritional decision"
        : "Control into finishing window",
      note: `Consistent with the primary ${winner.lastName} edge in the model.`,
    },
    aTd != null && bTd != null && Math.abs(aTd - bTd) >= 5
      ? {
          title:
            aTd > bTd
              ? `${fighterB.lastName} gets to the mat`
              : `${fighterA.lastName} gets to the mat`,
          favours: aTd > bTd ? fighterB.lastName : fighterA.lastName,
          trigger: "Successful takedown entries",
          route: "Grappling leverage / control time",
          note:
            aTd > bTd
              ? `Must beat ${fighterA.lastName}’s ${aTd}% takedown defense.`
              : `Must beat ${fighterB.lastName}’s ${bTd}% takedown defense.`,
        }
      : {
          title: "High-pace exchanges",
          favours: "Either — variance rises",
          trigger: "Early hard exchanges",
          route: "Finish or stolen rounds",
          note: `Compresses the predicted edge for ${winner.lastName}.`,
        },
    {
      title: `${loser.lastName} forces the upset`,
      favours: loser.lastName,
      trigger: "Early damage or scramble",
      route: "Finish before control settles",
      note: `Largest path against the ${winner.lastName} pick.`,
    },
  ];

  return (
    <section id="analysis-scenarios" className="scroll-mt-[var(--fs-scroll-margin,5.5rem)] space-y-5">
      <div>
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
          Fight scenarios
        </h2>
        <p className="mt-1 text-[13px] text-mute">
          Condition-based paths — no invented scenario probabilities.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {scenarios.map((s, i) => (
          <article key={s.title} className="border-t border-accent/35 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-mute uppercase">
              Scenario {String.fromCharCode(65 + i)}
            </p>
            <h3 className="mt-2 text-sm font-semibold tracking-tight text-ink uppercase">
              {s.title}
            </h3>
            <dl className="mt-3 space-y-2 text-[13px]">
              <div className="flex gap-2">
                <dt className="w-[4.75rem] shrink-0 text-mute">Favours</dt>
                <dd className="font-medium text-ink">{s.favours}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[4.75rem] shrink-0 text-mute">Trigger</dt>
                <dd className="text-ink/90">{s.trigger}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[4.75rem] shrink-0 text-mute">Likely path</dt>
                <dd className="text-ink/90">{s.route}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[13px] leading-5 text-mute">{s.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PathsAndRisks({
  fighterA,
  fighterB,
  winner,
  loser,
  howA,
  howB,
  isPro,
  methodDist,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  winner: Fighter;
  loser: Fighter;
  howA: string | null;
  howB: string | null;
  isPro: boolean;
  methodDist: ReturnType<typeof methodSharesFromJoint>;
}) {
  const pathA = buildVictoryPath(fighterA, fighterB, howA);
  const pathB = buildVictoryPath(fighterB, fighterA, howB);

  const riskBits: string[] = [];
  const loserThreat = fighterFinishingThreat(loser);
  if (loserThreat) {
    riskBits.push(
      `${loser.lastName}’s finishing profile (${loserThreat}) is the clearest threat to the ${winner.lastName} pick.`,
    );
  }
  if (methodDist && methodDist.finishPct >= 45) {
    riskBits.push(
      `Model finish probability is ${methodDist.finishPct}% — early variance can override volume edges.`,
    );
  }
  const reachGap =
    fighterA.reachCm != null && fighterB.reachCm != null
      ? Math.abs(fighterA.reachCm - fighterB.reachCm)
      : 0;
  if (reachGap >= 8 && loser.reachCm != null && winner.reachCm != null && loser.reachCm > winner.reachCm) {
    riskBits.push(
      `${loser.lastName}’s reach edge (${loser.reachCm} cm vs ${winner.reachCm} cm) can stall the preferred range if distance is managed.`,
    );
  }
  if (!riskBits.length) {
    riskBits.push(
      `FightScope favors ${winner.lastName}, but ${loser.lastName} can still flip the fight by forcing an early scramble or finish.`,
    );
  }

  return (
    <section className="scroll-mt-[var(--fs-scroll-margin,5.5rem)] space-y-8">
      <div>
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
          Paths to victory
        </h2>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <PathCard title={`How ${fighterA.lastName} wins`} path={pathA} />
        <PathCard title={`How ${fighterB.lastName} wins`} path={pathB} />
      </div>

      <div className="border border-white/[0.08] px-5 py-5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
          What could flip the fight?
        </p>
        <ul className="mt-3 space-y-2">
          {riskBits.slice(0, 3).map((b) => (
            <li key={b} className="text-[14px] leading-6 text-mute">
              {b}
            </li>
          ))}
        </ul>
        {!isPro ? (
          <p className="mt-3 text-[12px] text-mute/70">
            Fuller narrative paths unlock on Pro; structural routes use verified stats.
          </p>
        ) : null}
      </div>
    </section>
  );
}

type VictoryPath = {
  route: string;
  advantage: string;
  exploit: string;
  danger: string;
};

function PathCard({ title, path }: { title: string; path: VictoryPath }) {
  return (
    <div className="space-y-3 border-l-2 border-accent/50 pl-4">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">{title}</p>
      <dl className="space-y-2 text-[13px] leading-5">
        <div className="flex gap-2">
          <dt className="w-[4.75rem] shrink-0 text-mute">Route</dt>
          <dd className="text-ink/90">{path.route}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-[4.75rem] shrink-0 text-mute">Advantage</dt>
          <dd className="text-ink/90">{path.advantage}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-[4.75rem] shrink-0 text-mute">Exploit</dt>
          <dd className="text-ink/90">{path.exploit}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-[4.75rem] shrink-0 text-mute">Danger</dt>
          <dd className="text-ink/90">{path.danger}</dd>
        </div>
      </dl>
    </div>
  );
}

function buildVictoryPath(self: Fighter, opp: Fighter, prose: string | null): VictoryPath {
  const structural = buildStructuralVictoryPath(self, opp);
  if (prose) {
    return {
      ...structural,
      route: sanitizeAnalysisCopy(prose),
    };
  }
  return structural;
}

function buildStructuralVictoryPath(self: Fighter, opp: Fighter): VictoryPath {
  const wins = self.record.wins;
  const koRate = wins > 0 && self.finishes.koTko != null ? self.finishes.koTko / wins : null;
  const subRate = wins > 0 && self.finishes.submissions != null ? self.finishes.submissions / wins : null;
  const slpm = self.statistics.sigStrikesLandedPerMin;
  const sapmOpp = opp.statistics.sigStrikesAbsorbedPerMin;
  const strAcc = self.statistics.sigStrikeAccuracy;
  const strDefOpp = opp.statistics.strikingDefense;
  const td = self.statistics.takedownsPer15;
  const tdDefOpp = opp.statistics.takedownDefense;
  const reachSelf = self.reachCm;
  const reachOpp = opp.reachCm;

  const routeParts: string[] = [];
  if (koRate != null && koRate >= 0.45) {
    routeParts.push("pressure into an early KO/TKO window");
  } else if (subRate != null && subRate >= 0.3) {
    routeParts.push("chain wrestling into submission attempts");
  } else if (td != null && td >= 1.5) {
    routeParts.push(
      tdDefOpp != null
        ? `force wrestling entries vs ${Math.round(tdDefOpp)}% TD defense`
        : `force wrestling volume (${td.toFixed(1)} TD/15)`,
    );
  } else if (slpm != null && slpm >= 3.5) {
    routeParts.push(`win minutes at range (${slpm.toFixed(1)} SLpM)`);
  } else if (reachSelf != null && reachOpp != null && reachSelf - reachOpp >= 5) {
    routeParts.push(`manage distance with the ${reachSelf - reachOpp} cm reach edge`);
  } else {
    routeParts.push("impose preferred range and bank cleaner rounds");
  }

  const advantageCandidates: Array<{ score: number; label: string }> = [];
  if (koRate != null) {
    const oppKo =
      opp.record.wins > 0 && opp.finishes.koTko != null ? opp.finishes.koTko / opp.record.wins : 0;
    advantageCandidates.push({
      score: koRate - oppKo,
      label: `${Math.round(koRate * 100)}% KO/TKO win rate`,
    });
  }
  if (subRate != null) {
    const oppSub =
      opp.record.wins > 0 && opp.finishes.submissions != null
        ? opp.finishes.submissions / opp.record.wins
        : 0;
    advantageCandidates.push({
      score: subRate - oppSub,
      label: `${Math.round(subRate * 100)}% submission win rate`,
    });
  }
  if (reachSelf != null && reachOpp != null) {
    advantageCandidates.push({
      score: (reachSelf - reachOpp) / 20,
      label: `${reachSelf} cm reach`,
    });
  }
  if (slpm != null && opp.statistics.sigStrikesLandedPerMin != null) {
    advantageCandidates.push({
      score: (slpm - opp.statistics.sigStrikesLandedPerMin) / 5,
      label: `${slpm.toFixed(1)} significant strikes/min`,
    });
  }
  if (self.attributes.striking != null && opp.attributes.striking != null) {
    advantageCandidates.push({
      score: (self.attributes.striking - opp.attributes.striking) / 40,
      label: `FightScope striking ${Math.round(self.attributes.striking)}/100`,
    });
  }
  advantageCandidates.sort((a, b) => b.score - a.score);
  const advantage =
    advantageCandidates[0] && advantageCandidates[0].score > 0.02
      ? advantageCandidates[0].label
      : `Cleaner structural profile vs ${opp.lastName}`;

  let exploit = `Disrupt ${opp.lastName}’s preferred entries and keep exchanges short.`;
  if (strDefOpp != null && strDefOpp <= 55 && strAcc != null) {
    exploit = `Target striking openings — ${opp.lastName} defends ${Math.round(strDefOpp)}% of significant strikes.`;
  } else if (tdDefOpp != null && tdDefOpp <= 65 && td != null && td >= 1) {
    exploit = `Attack the mat — ${opp.lastName}’s takedown defense sits at ${Math.round(tdDefOpp)}%.`;
  } else if (sapmOpp != null && sapmOpp >= 4) {
    exploit = `Lean on volume — ${opp.lastName} absorbs ${sapmOpp.toFixed(1)} significant strikes/min.`;
  } else if (reachSelf != null && reachOpp != null && reachSelf > reachOpp + 4) {
    exploit = `Keep ${opp.lastName} at the end of the jab and deny inside entries.`;
  }

  const oppThreat = fighterFinishingThreat(opp);
  const danger = oppThreat
    ? `Avoid extended pockets where ${opp.lastName} can finish (${oppThreat}).`
    : `Do not give ${opp.lastName} extended control or unchecked early exchanges.`;

  return {
    route: routeParts.join("; "),
    advantage,
    exploit,
    danger,
  };
}

function fighterFinishingThreat(fighter: Fighter): string | null {
  const wins = fighter.record.wins;
  const ko = fighter.finishes.koTko;
  const sub = fighter.finishes.submissions;
  if (wins <= 0 || (ko == null && sub == null)) return null;
  const bits: string[] = [];
  if (ko != null && ko > 0) bits.push(`${Math.round((ko / wins) * 100)}% KO/TKO wins`);
  if (sub != null && sub > 0) bits.push(`${Math.round((sub / wins) * 100)}% submission wins`);
  return bits.length ? bits.join(", ") : null;
}

function DataCoverageChip({
  level,
  fighterA,
  fighterB,
  reasons,
}: {
  level: string;
  fighterA: Fighter;
  fighterB: Fighter;
  reasons?: string[];
}) {
  const [open, setOpen] = useState(false);
  const checklist = useMemo(
    () => buildCoverageChecklist(fighterA, fighterB),
    [fighterA, fighterB],
  );

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className="min-h-[40px] cursor-pointer rounded-full border border-white/[0.1] bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-mute uppercase transition-colors hover:border-white/20 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Data coverage · {level.toLowerCase()}
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-2 w-72 rounded-xl border border-white/[0.1] bg-[#121218] p-4 shadow-xl sm:left-1/2 sm:-translate-x-1/2">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-accent uppercase">
            Data coverage — {level}
          </p>
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-mute">{item.label}</span>
                <span
                  className={cn(
                    "font-medium",
                    item.status === "ok" && "text-ink",
                    item.status === "partial" && "text-amber-200/80",
                    item.status === "missing" && "text-mute/60",
                  )}
                >
                  {item.status === "ok" ? "✓" : item.status === "partial" ? "Partial" : "—"}
                </span>
              </li>
            ))}
          </ul>
          {reasons?.length ? (
            <p className="mt-3 text-[11px] leading-5 text-mute/80">{reasons.slice(0, 2).join(" · ")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DataSourcesSection({
  fighterA,
  fighterB,
  coverageLevel,
  modelVersion,
  featureVersion,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  coverageLevel: string;
  modelVersion?: string;
  featureVersion?: string;
}) {
  const [open, setOpen] = useState(false);
  const checklist = buildCoverageChecklist(fighterA, fighterB);
  const okCount = checklist.filter((c) => c.status === "ok").length;
  const portraitA = fighterA.portrait.status;
  const portraitB = fighterB.portrait.status;
  const model =
    [modelVersion, featureVersion].filter(Boolean).join(" · ") || "FightScope engine";

  return (
    <section id="analysis-sources" className="scroll-mt-[var(--fs-scroll-margin,5.5rem)] border-t border-white/[0.06] pt-8">
      <h2 className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
        Data & sources
      </h2>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-[14px]">
        <p>
          <span className="text-mute">Data quality</span>{" "}
          <span className="font-semibold text-ink">{coverageLevel}</span>
        </p>
        <p className="text-mute/40">·</p>
        <p>
          <span className="font-mono text-ink">{okCount}</span>
          <span className="text-mute"> / {checklist.length} profile fields verified</span>
        </p>
        <p className="text-mute/40">·</p>
        <p className="text-mute">{model}</p>
      </div>

      <button
        type="button"
          className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-4 py-2.5 text-[11px] font-semibold tracking-[0.1em] text-ink uppercase transition-colors hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Hide methodology" : "View methodology & sources"}
          <span className={cn("text-accent transition-transform", open && "rotate-180")} aria-hidden>
            ▼
          </span>
        </button>

      {open ? (
        <div className="mt-5 grid gap-3 text-[13px] text-mute sm:grid-cols-2 lg:grid-cols-4">
          <MetaCell label="Coverage" value={coverageLevel} />
          <MetaCell label="Profile fields verified" value={`${okCount} / ${checklist.length}`} />
          <MetaCell label="Portrait provenance" value={`${portraitA} / ${portraitB}`} />
          <MetaCell label="Model" value={model} />
          <p className="sm:col-span-2 lg:col-span-4 max-w-2xl text-[12px] leading-5 text-mute/70">
            Win probabilities and method shares come from the FightScope prediction engine.
            Narrative text interprets those outputs — it does not invent statistics.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.1em] text-mute/60 uppercase">{label}</p>
      <p className="mt-1 text-ink">{value}</p>
    </div>
  );
}
