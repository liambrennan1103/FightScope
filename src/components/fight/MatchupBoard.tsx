"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { ProbabilityBar } from "@/components/fight/PredictionDisplay";
import { ButtonLink } from "@/components/ui/Button";
import { CountUpPct, useInViewOnce } from "@/components/ui/CountUp";
import { ParallaxFrame } from "@/components/ui/ParallaxFrame";
import { cn } from "@/lib/cn";
import { formatCompactDate, formatRecord } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { FightView, Fighter, Prediction } from "@/lib/types";

type MatchupVariant = "card" | "featured" | "hero";

interface MatchupVisualProps {
  fighterA: Fighter;
  fighterB: Fighter;
  prediction?: Prediction;
  /** Draw share when available (shown discreetly between win %). */
  drawPct?: number;
  eventName?: string;
  date?: string;
  division?: string | null;
  rounds?: 3 | 5;
  titleLabel?: string | null;
  kicker?: string | null;
  variant?: MatchupVariant;
  showPick?: boolean;
  /** When false, hide win % / pick / probability bar (gated until analyze). Default true. */
  showPrediction?: boolean;
  href?: string;
  actions?: React.ReactNode;
  className?: string;
  statusLabel?: string | null;
  /** Replaces the VS / probability core (e.g. analysis loader). */
  centerSlot?: ReactNode;
  analyzing?: boolean;
}

export function MatchupVisual({
  fighterA,
  fighterB,
  prediction,
  drawPct = 0,
  eventName,
  date,
  division,
  rounds,
  titleLabel,
  kicker,
  variant = "card",
  showPick = true,
  showPrediction = true,
  href,
  actions,
  className,
  statusLabel,
  centerSlot,
  analyzing = false,
}: MatchupVisualProps) {
  const leftPct = prediction?.fighterAWinPct ?? 0;
  const rightPct = prediction?.fighterBWinPct ?? 0;
  const predictedA = prediction ? prediction.predictedWinnerId === fighterA.id : false;
  const pick = predictedA ? fighterA : fighterB;
  const isHero = variant === "hero" || variant === "featured";
  const boardKicker = kicker || titleLabel || statusLabel || (isHero ? "Matchup" : null);
  const meta = [
    eventName && isHero ? eventName : null,
    date ? formatCompactDate(date) : null,
    division && isHero ? division : null,
    isHero && rounds ? `${rounds} rounds` : null,
    !isHero ? eventName : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const showPct = showPrediction && !analyzing && !centerSlot;

  const inner = (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-white/[0.08] bg-surface shadow-[var(--glass-shadow)]",
        isHero && "fs-board fs-glass-float-card",
        href &&
          "fs-fight-card cursor-pointer transition-[border-color,background-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[3px] hover:border-white/16 hover:shadow-[0_12px_36px_rgba(0,0,0,0.35)]",
        analyzing && "fs-analyzing-board",
        className,
      )}
      data-pick={isHero && showPct ? (predictedA ? "left" : "right") : undefined}
    >
      <div
        className={cn(
          "relative z-10 flex items-center justify-between gap-3 border-b border-white/[0.06]",
          isHero ? "px-4 py-3 sm:px-6" : "px-4 py-2.5",
        )}
      >
        <p
          className={cn(
            "min-w-0 text-[11px] font-semibold tracking-[0.14em] text-accent uppercase",
            isHero ? "truncate" : "shrink-0",
          )}
        >
          {analyzing ? "Analyzing" : boardKicker}
        </p>
        {meta ? (
          <p
            className={cn(
              "min-w-0 text-right text-[11px] text-mute",
              isHero ? "truncate" : "truncate sm:max-w-[55%]",
            )}
          >
            {meta}
          </p>
        ) : null}
      </div>

      <div className={cn("relative z-10 px-4", isHero ? "pt-5 pb-5 sm:px-6 sm:pt-7 sm:pb-6" : "pt-4 pb-4")}>
        {isHero ? (
          <>
            <MobileHero
              fighterA={fighterA}
              fighterB={fighterB}
              leftPct={leftPct}
              rightPct={rightPct}
              drawPct={drawPct}
              predictedA={predictedA}
              pick={pick}
              showPick={showPick && showPct}
              showPrediction={showPct}
              size={variant === "featured" ? "featured" : "hero"}
              centerSlot={centerSlot}
            />
            <DesktopHero
              fighterA={fighterA}
              fighterB={fighterB}
              leftPct={leftPct}
              rightPct={rightPct}
              drawPct={drawPct}
              predictedA={predictedA}
              pick={pick}
              showPick={showPick && showPct}
              showPrediction={showPct}
              size={variant === "featured" ? "featured" : "hero"}
              centerSlot={centerSlot}
            />
          </>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
            <CardFighter
              fighter={fighterA}
              pctValue={leftPct}
              predicted={predictedA}
              showPrediction={showPct}
            />
            {centerSlot ?? (
              <span className="text-[10px] font-semibold tracking-[0.2em] text-mute">VS</span>
            )}
            <CardFighter
              fighter={fighterB}
              pctValue={rightPct}
              predicted={!predictedA}
              showPrediction={showPct}
            />
          </div>
        )}

        {showPct ? (
          <ProbabilityBar
            className={cn("mt-5", isHero ? "h-2" : "h-1")}
            leftPct={leftPct}
            predictedSide={predictedA ? "left" : "right"}
            durationMs={2200}
          />
        ) : null}

        {!isHero && showPct && showPick ? (
          <p className="mt-2.5 text-[13px] text-mute">
            Pick <span className="font-semibold text-accent">{pick.lastName}</span>
          </p>
        ) : null}

        {!isHero && !showPct && !analyzing ? (
          <p className="mt-2.5 text-[13px] text-mute">Analyze fight →</p>
        ) : null}

        {actions ? (
          <div className={cn("mt-5 flex flex-wrap gap-2", isHero && "justify-center")}>{actions}</div>
        ) : null}
      </div>
    </div>
  );

  if (href && !actions) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }

  return inner;
}

function Nickname({ value }: { value: string | null }) {
  if (!value) return null;
  return <p className="mt-0.5 truncate text-[11px] text-mute">“{value}”</p>;
}

function HeroFighter({
  fighter,
  predicted,
  align,
  size,
}: {
  fighter: Fighter;
  predicted: boolean;
  align: "left" | "right" | "center";
  size: "hero" | "featured";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center",
        align === "left" && "md:items-end",
        align === "right" && "md:items-start",
      )}
    >
      <ParallaxFrame className="rounded-xl" strength={5}>
        <FighterPortrait fighter={fighter} name={fighter.name} variant={size} ring={predicted} />
      </ParallaxFrame>
      <div
        className={cn(
          "mt-3 w-full min-w-0 text-center",
          align === "left" && "md:text-right",
          align === "right" && "md:text-left",
        )}
      >
        <p
          className={cn(
            "truncate font-semibold tracking-tight text-ink",
            size === "featured" ? "text-lg lg:text-2xl" : "text-base lg:text-xl",
          )}
        >
          {fighter.name}
        </p>
        <Nickname value={fighter.nickname} />
        <p className="mt-1 text-[12px] text-mute">{formatRecord(fighter.record)}</p>
      </div>
    </div>
  );
}

function HeroCore({
  leftPct,
  rightPct,
  drawPct = 0,
  predictedA,
  pick,
  showPick,
  showPrediction,
  centerSlot,
}: {
  leftPct: number;
  rightPct: number;
  drawPct?: number;
  predictedA: boolean;
  pick: Fighter;
  showPick: boolean;
  showPrediction: boolean;
  centerSlot?: ReactNode;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);

  if (centerSlot) {
    return <div className="flex justify-center">{centerSlot}</div>;
  }

  return (
    <div
      ref={ref}
      className="flex min-w-[7.5rem] flex-col items-center justify-center px-1 lg:min-w-[10rem] lg:px-3"
    >
      <p className="text-[11px] font-semibold tracking-[0.28em] text-mute">VS</p>
      {showPrediction ? (
        <>
          <div className="mt-3 flex items-end gap-2 lg:gap-3">
            <CountUpPct
              value={leftPct}
              active={inView}
              durationMs={2200}
              className={cn(
                "text-4xl font-semibold leading-none lg:text-6xl",
                predictedA ? "text-accent" : "text-mute",
              )}
            />
            {drawPct > 0 ? (
              <div className="mb-1 flex flex-col items-center px-1">
                <CountUpPct
                  value={drawPct}
                  active={inView}
                  durationMs={2200}
                  className="text-lg font-semibold leading-none text-mute/80 lg:text-2xl"
                />
                <span className="mt-1 text-[9px] font-semibold tracking-[0.12em] text-mute/60 uppercase">
                  Draw
                </span>
              </div>
            ) : null}
            <CountUpPct
              value={rightPct}
              active={inView}
              durationMs={2200}
              className={cn(
                "text-4xl font-semibold leading-none lg:text-6xl",
                !predictedA ? "text-accent" : "text-mute",
              )}
            />
          </div>
          {showPick ? (
            <p className="mt-3 text-center text-xs text-mute">
              FightScope pick{" "}
              <span className="font-semibold text-accent">{pick.lastName}</span>
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function DesktopHero({
  fighterA,
  fighterB,
  leftPct,
  rightPct,
  drawPct = 0,
  predictedA,
  pick,
  showPick,
  showPrediction,
  size,
  centerSlot,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  leftPct: number;
  rightPct: number;
  drawPct?: number;
  predictedA: boolean;
  pick: Fighter;
  showPick: boolean;
  showPrediction: boolean;
  size: "hero" | "featured";
  centerSlot?: ReactNode;
}) {
  return (
    <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-4 lg:gap-8">
      <HeroFighter
        fighter={fighterA}
        predicted={showPrediction && predictedA}
        align="left"
        size={size}
      />
      <HeroCore
        leftPct={leftPct}
        rightPct={rightPct}
        drawPct={drawPct}
        predictedA={predictedA}
        pick={pick}
        showPick={showPick}
        showPrediction={showPrediction}
        centerSlot={centerSlot}
      />
      <HeroFighter
        fighter={fighterB}
        predicted={showPrediction && !predictedA}
        align="right"
        size={size}
      />
    </div>
  );
}

function CardFighter({
  fighter,
  pctValue,
  predicted,
  showPrediction,
}: {
  fighter: Fighter;
  pctValue: number;
  predicted: boolean;
  showPrediction: boolean;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.35);

  return (
    <div ref={ref} className="flex min-w-0 flex-col items-center text-center">
      <FighterPortrait fighter={fighter} name={fighter.name} portrait={fighter.portrait} variant="card" />
      <p className="mt-2 w-full truncate text-sm font-semibold tracking-tight text-ink">
        {fighter.lastName || fighter.name}
      </p>
      {showPrediction ? (
        <CountUpPct
          value={pctValue}
          active={inView}
          className={cn(
            "mt-1.5 text-xl font-semibold leading-none sm:text-2xl",
            predicted ? "text-accent" : "text-mute",
          )}
        />
      ) : null}
    </div>
  );
}

function MobileHero({
  fighterA,
  fighterB,
  leftPct,
  rightPct,
  drawPct = 0,
  predictedA,
  pick,
  showPick,
  showPrediction,
  size,
  centerSlot,
}: {
  fighterA: Fighter;
  fighterB: Fighter;
  leftPct: number;
  rightPct: number;
  drawPct?: number;
  predictedA: boolean;
  pick: Fighter;
  showPick: boolean;
  showPrediction: boolean;
  size: "hero" | "featured";
  centerSlot?: ReactNode;
}) {
  return (
    <div className="md:hidden">
      <div className="grid grid-cols-2 justify-items-center gap-4">
        <HeroFighter
          fighter={fighterA}
          predicted={showPrediction && predictedA}
          align="center"
          size={size}
        />
        <HeroFighter
          fighter={fighterB}
          predicted={showPrediction && !predictedA}
          align="center"
          size={size}
        />
      </div>
      <div className="mt-5">
        <HeroCore
          leftPct={leftPct}
          rightPct={rightPct}
          drawPct={drawPct}
          predictedA={predictedA}
          pick={pick}
          showPick={showPick}
          showPrediction={showPrediction}
          centerSlot={centerSlot}
        />
      </div>
    </div>
  );
}

export function FightMatchup({
  view,
  variant = "card",
  showPick = true,
  showPrediction = true,
  href,
  actions,
  className,
}: {
  view: FightView;
  variant?: MatchupVariant;
  showPick?: boolean;
  showPrediction?: boolean;
  href?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const { fight, event, fighterA, fighterB, prediction } = view;
  const completed = fight.status === "completed";
  const kicker = completed
    ? "Final"
    : fight.isTitle
      ? fight.titleLabel ?? "Title fight"
      : fight.cardSegment === "main-event"
        ? "Main event"
        : variant === "featured"
          ? "Featured fight"
          : "Bout";

  return (
    <MatchupVisual
      fighterA={fighterA}
      fighterB={fighterB}
      prediction={prediction}
      eventName={event.name}
      date={event.date}
      division={fight.division}
      rounds={fight.rounds}
      titleLabel={fight.isTitle ? fight.titleLabel ?? "Title" : null}
      kicker={kicker}
      variant={variant}
      showPick={showPick && !completed}
      showPrediction={showPrediction}
      href={href}
      actions={actions}
      className={className}
      statusLabel={completed ? "Final" : null}
    />
  );
}

export function FeaturedEventBoard({
  view,
  showEventCta = true,
}: {
  view: FightView;
  showEventCta?: boolean;
}) {
  return (
    <FightMatchup
      view={view}
      variant="featured"
      showPick={false}
      showPrediction={false}
      actions={
        <>
          <ButtonLink href={routes.fight(view.fight.slug)}>Open analysis</ButtonLink>
          {showEventCta ? (
            <ButtonLink href={routes.event(view.event.slug)} variant="secondary">
              Full card
            </ButtonLink>
          ) : null}
        </>
      }
    />
  );
}
