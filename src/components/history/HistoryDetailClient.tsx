"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnalysisResultReveal } from "@/components/fight/AnalysisResultReveal";
import { MatchupVisual } from "@/components/fight/MatchupBoard";
import { MethodPrediction } from "@/components/fight/MethodPrediction";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { useAccount } from "@/components/providers/AccountProvider";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  getHistoryItem,
  isPreFightHistory,
  type AnalysisHistoryItem,
  type AnalysisHistoryPortrait,
} from "@/lib/analysis-history";
import { clientAnalysisFromPrediction } from "@/lib/analysis-payload";
import { formatCompactDate, pct } from "@/lib/format";
import {
  drawPctFromPrediction,
  evaluatePrediction,
  type PredictionEvaluation,
} from "@/lib/prediction-evaluation";
import { compareHref, routes } from "@/lib/routes";
import type {
  Fight,
  FightOutcome,
  Fighter,
  FighterPortraitConfig,
  PortraitStatus,
} from "@/lib/types";

export type HistoryFightContext = Pick<
  Fight,
  "slug" | "status" | "outcome" | "division" | "rounds" | "eventId" | "isTitle" | "titleLabel"
> & {
  eventName?: string;
  eventDate?: string;
  eventSlug?: string;
};

export function HistoryDetailClient({
  id,
  fighters,
  fights,
}: {
  id: string;
  fighters: Fighter[];
  fights: HistoryFightContext[];
}) {
  const { isPro } = useAccount();
  const [item, setItem] = useState<AnalysisHistoryItem | null | undefined>(undefined);

  useEffect(() => {
    setItem(getHistoryItem(id));
  }, [id]);

  const fightCtx = useMemo(() => {
    if (!item?.fightSlug) return null;
    return fights.find((fight) => fight.slug === item.fightSlug) ?? null;
  }, [fights, item]);

  if (item === undefined) {
    return (
      <div className="space-y-4">
        <div className="fs-shimmer h-8 w-48 rounded-lg" />
        <div className="fs-shimmer h-64 rounded-xl" />
        <div className="fs-shimmer h-56 rounded-xl" />
      </div>
    );
  }

  if (!item) {
    return (
      <EmptyState
        title="Analysis not found"
        description="This history item may have been removed from this device."
        action={
          <ButtonLink href={routes.history} variant="secondary" size="sm">
            Back to history
          </ButtonLink>
        }
      />
    );
  }

  const preFight = isPreFightHistory(item);
  const fighterA =
    item.fighterASnapshot ??
    fighters.find((fighter) => fighter.id === item.fighterAId) ??
    fighters.find((fighter) => fighter.slug === item.fighterASlug) ??
    null;
  const fighterB =
    item.fighterBSnapshot ??
    fighters.find((fighter) => fighter.id === item.fighterBId) ??
    fighters.find((fighter) => fighter.slug === item.fighterBSlug) ??
    null;

  const winnerIsA = item.predictedWinnerId === item.fighterAId;
  const winnerName = winnerIsA ? item.fighterAName : item.fighterBName;
  const hadProCopy = Boolean(
    item.prediction.analysis.howAWins || item.prediction.analysis.howBWins,
  );
  const drawPct = drawPctFromPrediction(item.prediction);
  const outcome = fightCtx?.outcome ?? null;
  const completed = fightCtx?.status === "completed";
  const evaluation =
    completed && preFight ? evaluatePrediction(item.prediction, outcome) : null;

  const eventName = item.eventName || fightCtx?.eventName;
  const eventDate = item.eventDate || fightCtx?.eventDate;
  const division = item.division || fightCtx?.division;
  const rounds = item.rounds || fightCtx?.rounds;
  const generatedLabel = formatGeneratedAt(item.generatedAt);
  const modelLabel = [item.modelVersion || item.prediction.modelVersion, item.dataSnapshotVersion]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-10 sm:space-y-12">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="mute">History</Badge>
          <Badge tone={preFight ? "accent" : "mute"}>
            {preFight ? "Saved pre-fight analysis" : "Retrospective run"}
          </Badge>
          <Badge tone="mute">Saved · no new AI request</Badge>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
              Saved analysis
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {item.fighterAName.split(" ").slice(-1)[0]} vs{" "}
              {item.fighterBName.split(" ").slice(-1)[0]}
            </h1>
            <p className="mt-2 text-sm text-mute">
              {[
                item.fighterAName,
                "vs",
                item.fighterBName,
                eventName,
                eventDate ? formatCompactDate(eventDate) : null,
                division,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-2 text-[12px] text-mute">
              Generated {generatedLabel}
              {modelLabel ? ` · ${modelLabel}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href={routes.history} variant="ghost" size="sm">
              All history
            </ButtonLink>
            {item.fightSlug ? (
              <ButtonLink href={routes.fight(item.fightSlug)} variant="secondary" size="sm">
                View current fight page
              </ButtonLink>
            ) : (
              <ButtonLink
                href={compareHref(item.fighterASlug, item.fighterBSlug)}
                variant="secondary"
                size="sm"
              >
                Open in Compare
              </ButtonLink>
            )}
          </div>
        </div>
      </header>

      {!preFight ? (
        <p className="rounded-xl border border-amber/30 bg-amber/5 px-4 py-3 text-sm text-mute">
          <span className="font-semibold text-ink">Not a pre-fight prediction. </span>
          This run was generated after the bout was already completed. It is kept for reference
          only and is not an original FightScope pre-fight archive.
        </p>
      ) : null}

      {completed && outcome ? (
        <OfficialResultBanner
          outcome={outcome}
          fighterAName={item.fighterAName}
          fighterBName={item.fighterBName}
          fighterAId={item.fighterAId}
          fighterBId={item.fighterBId}
        />
      ) : null}

      {preFight ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
            Original FightScope prediction
          </p>
          <p className="text-[12px] text-mute">
            Frozen pre-fight probabilities — never rewritten after the official result.
          </p>
        </div>
      ) : null}

      {fighterA && fighterB ? (
        <div className="space-y-10 sm:space-y-12">
          <MatchupVisual
            fighterA={fighterA}
            fighterB={fighterB}
            prediction={item.prediction}
            drawPct={drawPct}
            eventName={eventName}
            date={eventDate}
            division={division}
            rounds={rounds}
            titleLabel={fightCtx?.isTitle ? fightCtx.titleLabel ?? "Title" : null}
            kicker={preFight ? "Original prediction" : "Retrospective"}
            variant="hero"
            showPick
            showPrediction
          />

          {evaluation ? (
            <PredictionEvaluationPanel
              evaluation={evaluation}
              predictedWinnerName={winnerName}
              fighterAName={item.fighterAName}
              fighterBName={item.fighterBName}
              fighterAId={item.fighterAId}
              fighterBId={item.fighterBId}
              aPct={item.fighterAWinPct}
              bPct={item.fighterBWinPct}
              drawPct={drawPct}
            />
          ) : null}

          <AnalysisResultReveal
            fighterA={fighterA}
            fighterB={fighterB}
            analysis={clientAnalysisFromPrediction(
              item.prediction,
              isPro && hadProCopy ? "pro" : "starter",
              fighterA,
              fighterB,
            )}
            historical
          />
        </div>
      ) : (
        <SavedPredictionSummary item={item} evaluation={evaluation} />
      )}
    </div>
  );
}

function OfficialResultBanner({
  outcome,
  fighterAName,
  fighterBName,
  fighterAId,
  fighterBId,
}: {
  outcome: FightOutcome;
  fighterAName: string;
  fighterBName: string;
  fighterAId: string;
  fighterBId: string;
}) {
  const winnerName =
    outcome.winnerId === fighterAId
      ? fighterAName
      : outcome.winnerId === fighterBId
        ? fighterBName
        : outcome.winnerId
          ? "Winner"
          : "Draw";

  return (
    <section className="rounded-2xl border border-white/[0.1] bg-elevated/60 px-4 py-4 sm:px-5">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
        Official result
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-ink">{winnerName}</p>
      <p className="mt-1 text-sm text-mute">
        {[
          outcome.method,
          outcome.round != null ? `Round ${outcome.round}` : null,
          outcome.time,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </section>
  );
}

function PredictionEvaluationPanel({
  evaluation,
  predictedWinnerName,
  fighterAName,
  fighterBName,
  fighterAId,
  fighterBId,
  aPct,
  bPct,
  drawPct,
}: {
  evaluation: PredictionEvaluation;
  predictedWinnerName: string;
  fighterAName: string;
  fighterBName: string;
  fighterAId: string;
  fighterBId: string;
  aPct: number;
  bPct: number;
  drawPct: number;
}) {
  const actualWinnerName =
    evaluation.actualWinnerId === fighterAId
      ? fighterAName
      : evaluation.actualWinnerId === fighterBId
        ? fighterBName
        : evaluation.actualWinnerId
          ? "Winner"
          : "Draw";

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-surface px-4 py-5 sm:px-6">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
        FightScope result
      </p>
      <p className="mt-2 font-mono text-sm text-mute">
        <span className="text-ink">{aPct}%</span> {fighterAName.split(" ").slice(-1)[0]}
        <span className="mx-2 text-mute/50">·</span>
        <span className="text-ink">{drawPct}%</span> Draw
        <span className="mx-2 text-mute/50">·</span>
        <span className="text-ink">{bPct}%</span> {fighterBName.split(" ").slice(-1)[0]}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <EvalRow
          label="Winner prediction"
          detail={`Predicted ${predictedWinnerName.split(" ").slice(-1)[0]} · Actual ${actualWinnerName.split(" ").slice(-1)[0]}`}
          ok={evaluation.winnerCorrect}
        />
        <EvalRow
          label="Method prediction"
          detail={`Predicted ${evaluation.predictedMethodLabel} · Actual ${evaluation.actualMethodLabel ?? "—"}`}
          ok={evaluation.methodCorrect}
        />
      </div>
    </section>
  );
}

function EvalRow({
  label,
  detail,
  ok,
}: {
  label: string;
  detail: string;
  ok: boolean | null;
}) {
  const mark = ok === null ? "—" : ok ? "Correct" : "Incorrect";
  const tone =
    ok === null ? "text-mute" : ok ? "text-ink" : "text-accent";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-background/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">{label}</p>
        <p className={`text-sm font-medium ${tone}`}>
          {ok === true ? "✓ " : ok === false ? "✕ " : ""}
          {mark}
        </p>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-mute">{detail}</p>
    </div>
  );
}

function SavedPredictionSummary({
  item,
  evaluation,
}: {
  item: AnalysisHistoryItem;
  evaluation: PredictionEvaluation | null;
}) {
  const prediction = item.prediction;
  const winnerIsA = item.predictedWinnerId === item.fighterAId;
  const winnerName = winnerIsA ? item.fighterAName : item.fighterBName;
  const drawPct = drawPctFromPrediction(prediction);

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            Original FightScope prediction
          </p>
          <Badge tone="mute">{item.confidence} confidence</Badge>
        </div>
        <div className="grid gap-6 px-4 py-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-6">
          <HistoryFighterSide
            name={item.fighterAName}
            slug={item.fighterASlug}
            portrait={item.fighterAPortrait}
            winPct={item.fighterAWinPct}
            predicted={winnerIsA}
            align="left"
          />
          <div className="text-center">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-mute uppercase">vs</p>
            <p className="mt-2 tabular text-lg font-semibold text-ink">
              {pct(item.fighterAWinPct)} · {drawPct}% · {pct(item.fighterBWinPct)}
            </p>
            <p className="mt-2 text-xs text-mute">Pick {winnerName}</p>
          </div>
          <HistoryFighterSide
            name={item.fighterBName}
            slug={item.fighterBSlug}
            portrait={item.fighterBPortrait}
            winPct={item.fighterBWinPct}
            predicted={!winnerIsA}
            align="right"
          />
        </div>
      </div>

      {evaluation ? (
        <PredictionEvaluationPanel
          evaluation={evaluation}
          predictedWinnerName={winnerName}
          fighterAName={item.fighterAName}
          fighterBName={item.fighterBName}
          fighterAId={item.fighterAId}
          fighterBId={item.fighterBId}
          aPct={item.fighterAWinPct}
          bPct={item.fighterBWinPct}
          drawPct={drawPct}
        />
      ) : null}

      <section>
        <SectionHeader title="How it ends" />
        <MethodPrediction methods={prediction.methods} />
      </section>

      <section>
        <SectionHeader title="FightScope model note" />
        <p className="max-w-2xl text-sm leading-7 text-mute">{prediction.analysis.fightscopeRead}</p>
      </section>
    </div>
  );
}

function HistoryFighterSide({
  name,
  slug,
  portrait,
  winPct,
  predicted,
  align,
}: {
  name: string;
  slug: string;
  portrait: AnalysisHistoryPortrait;
  winPct: number;
  predicted: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <Link href={routes.fighter(slug)} className="inline-flex flex-col items-center gap-3 sm:items-stretch">
        <FighterPortrait
          name={name}
          portrait={toPortraitConfig(portrait)}
          fighter={{ slug, name, portrait: toPortraitConfig(portrait) }}
          variant="medium"
          className={align === "right" ? "sm:ml-auto" : undefined}
        />
        <div>
          <p className="text-sm font-medium text-ink">{name}</p>
          <p className={`mt-1 tabular text-sm ${predicted ? "text-accent" : "text-mute"}`}>
            {pct(winPct)}
            {predicted ? " · pick" : ""}
          </p>
        </div>
      </Link>
    </div>
  );
}

function toPortraitConfig(portrait: AnalysisHistoryPortrait): FighterPortraitConfig | null {
  if (!portrait) return null;
  const status = (portrait.status as PortraitStatus | undefined) ?? "fallback";
  return {
    src: portrait.src,
    objectPosition: portrait.objectPosition ?? "50% 14%",
    status,
  };
}

function formatGeneratedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return formatCompactDate(iso);
  }
}
