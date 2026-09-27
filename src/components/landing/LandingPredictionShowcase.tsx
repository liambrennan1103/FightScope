"use client";

import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { CountUpPct, LandingAnimatedBar, useInViewOnce } from "@/components/landing/LandingMotion";
import { ButtonLink } from "@/components/ui/Button";
import { formatEventDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import type { FightView } from "@/lib/types";

export function LandingPredictionShowcase({
  view,
  dataPoints,
}: {
  view: FightView | null;
  dataPoints: number | null;
}) {
  const { ref, inView } = useInViewOnce<HTMLElement>(0.2);

  if (!view) return null;

  const { fighterA, fighterB, prediction, fight, event } = view;
  const predictedA = prediction.predictedWinnerId === fighterA.id;
  const pick = predictedA ? fighterA : fighterB;

  return (
    <section
      id="featured-prediction"
      ref={ref}
      className="relative overflow-hidden border-b border-white/[0.05] bg-surface"
    >
      <div className="relative mx-auto max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
        <p className="text-center font-mono text-[11px] font-semibold tracking-[0.22em] text-mute uppercase">
          Featured prediction
        </p>

        {dataPoints != null && dataPoints > 0 ? (
          <p className="mt-3 text-center">
            <span className="inline-flex border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.1em] text-amber uppercase">
              Based on {dataPoints} data points
            </span>
          </p>
        ) : null}

        <div className="mt-10 grid items-end gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)_minmax(0,1fr)] sm:items-center sm:gap-4 lg:gap-10">
          <ShowcaseFighter
            fighter={fighterA}
            align="left"
            active={inView}
            highlighted={predictedA}
          />

          <div
            className={cn(
              "order-first text-center sm:order-none",
              "transition-[opacity,transform] duration-500 ease-out",
              inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
            )}
            style={{ transitionDelay: inView ? "120ms" : undefined }}
          >
            <p className="text-[11px] font-semibold tracking-[0.28em] text-mute">VS</p>
            <div className="mt-4 flex items-end justify-center gap-5 sm:gap-8">
              <CountUpPct
                value={prediction.fighterAWinPct}
                active={inView}
                className={cn(
                  "font-display text-5xl font-semibold sm:text-6xl lg:text-7xl",
                  predictedA ? "text-accent" : "text-ink/55",
                )}
              />
              <CountUpPct
                value={prediction.fighterBWinPct}
                active={inView}
                className={cn(
                  "font-display text-5xl font-semibold sm:text-6xl lg:text-7xl",
                  !predictedA ? "text-accent" : "text-ink/55",
                )}
              />
            </div>
            <p className="mt-4 text-[12px] font-semibold tracking-[0.16em] text-accent uppercase">
              FightScope pick · {pick.lastName}
            </p>
          </div>

          <ShowcaseFighter
            fighter={fighterB}
            align="right"
            active={inView}
            highlighted={!predictedA}
          />
        </div>

        <div
          className={cn(
            "mx-auto mt-10 max-w-2xl transition-[opacity,transform] duration-500 ease-out",
            inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          )}
          style={{ transitionDelay: inView ? "280ms" : undefined }}
        >
          <LandingAnimatedBar
            leftPct={prediction.fighterAWinPct}
            predictedSide={predictedA ? "left" : "right"}
            active={inView}
            className="h-3"
          />
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-sm text-mute">
          <span className="font-medium text-ink/90">{event.name}</span>
          {fight.division ? <span>{fight.division}</span> : null}
          <span>{fight.rounds} rounds</span>
          {event.date ? <span>{formatEventDate(event.date)}</span> : null}
        </div>

        <div className="mt-8 flex justify-center">
          <ButtonLink href={routes.signUp} size="lg">
            See my next fight
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function ShowcaseFighter({
  fighter,
  align,
  active,
  highlighted,
}: {
  fighter: FightView["fighterA"];
  align: "left" | "right";
  active: boolean;
  highlighted: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4",
        align === "right" ? "sm:items-end" : "sm:items-start",
        "transition-[opacity,transform] duration-600 ease-out",
        active
          ? "translate-x-0 opacity-100"
          : align === "left"
            ? "-translate-x-6 opacity-0"
            : "translate-x-6 opacity-0",
      )}
      style={{ transitionDelay: active ? (align === "left" ? "0ms" : "80ms") : undefined }}
    >
      <FighterPortrait
        fighter={fighter}
        name={fighter.name}
        portrait={fighter.portrait}
        variant="featured"
        ring={highlighted}
        className="h-[11rem] w-[8rem] sm:h-[14rem] sm:w-[10rem] lg:h-[18rem] lg:w-[13rem] !rounded-2xl"
      />
      <div className={cn("text-center", align === "left" ? "sm:text-left" : "sm:text-right")}>
        <p className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl lg:text-4xl">
          {fighter.lastName}
        </p>
        <p className="mt-1 text-sm text-mute sm:text-base">{fighter.firstName}</p>
      </div>
    </div>
  );
}
