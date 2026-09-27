"use client";

import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { CountUpPct, LandingAnimatedBar, useInViewOnce } from "@/components/landing/LandingMotion";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import type { FightView } from "@/lib/types";

export function LandingCinematicMatchup({ view }: { view: FightView | null }) {
  const { ref, inView } = useInViewOnce<HTMLElement>(0.2);

  if (!view) return null;

  const { fighterA, fighterB, prediction, fight } = view;
  const predictedA = prediction.predictedWinnerId === fighterA.id;

  const strikingEdge =
    (fighterA.attributes.striking ?? 0) >= (fighterB.attributes.striking ?? 0)
      ? fighterA.lastName
      : fighterB.lastName;
  const grapplingEdge =
    (fighterA.attributes.grappling ?? 0) >= (fighterB.attributes.grappling ?? 0)
      ? fighterA.lastName
      : fighterB.lastName;
  const formA = fighterA.record.wins - fighterA.record.losses;
  const formB = fighterB.record.wins - fighterB.record.losses;
  const formEdge = formA >= formB ? fighterA.lastName : fighterB.lastName;

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-b border-white/[0.05] min-h-[min(92vh,820px)]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 50% 55% at 50% 35%, rgba(227,59,59,0.18), transparent 60%), radial-gradient(ellipse 30% 40% at 15% 70%, rgba(255,255,255,0.04), transparent 50%), radial-gradient(ellipse 30% 40% at 85% 70%, rgba(255,255,255,0.04), transparent 50%), linear-gradient(180deg, #050506 0%, #0e0e11 40%, #050506 100%)",
        }}
      />

      {/* cage mesh */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent)",
        }}
      />

      {/* octagon */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-[min(78vmin,640px)] w-[min(78vmin,640px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.09]"
        aria-hidden="true"
        style={{
          clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
          border: "2px solid rgba(255,255,255,0.55)",
          boxShadow: "inset 0 0 120px rgba(227,59,59,0.35)",
        }}
      />

      <div className="relative mx-auto flex max-w-[1320px] flex-col justify-center px-4 py-20 sm:px-6 sm:py-28">
        <p className="text-center text-[11px] font-semibold tracking-[0.28em] text-mute uppercase">
          Fight prediction
        </p>

        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,auto)_minmax(0,1fr)] lg:gap-6">
          <CinematicFighter fighter={fighterA} align="left" active={inView} delay={0} />

          <div
            className={cn(
              "text-center transition-[opacity,transform] duration-500 ease-out",
              inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
            style={{ transitionDelay: inView ? "140ms" : undefined }}
          >
            <div className="flex items-end justify-center gap-6 sm:gap-10">
              <CountUpPct
                value={prediction.fighterAWinPct}
                active={inView}
                className={cn(
                  "text-5xl font-semibold sm:text-6xl lg:text-7xl",
                  predictedA ? "text-accent" : "text-ink/50",
                )}
              />
              <CountUpPct
                value={prediction.fighterBWinPct}
                active={inView}
                className={cn(
                  "text-5xl font-semibold sm:text-6xl lg:text-7xl",
                  !predictedA ? "text-accent" : "text-ink/50",
                )}
              />
            </div>
            <div className="mx-auto mt-6 max-w-sm">
              <LandingAnimatedBar
                leftPct={prediction.fighterAWinPct}
                predictedSide={predictedA ? "left" : "right"}
                active={inView}
                className="h-3"
              />
            </div>
          </div>

          <CinematicFighter fighter={fighterB} align="right" active={inView} delay={70} />
        </div>

        <div
          className={cn(
            "mx-auto mt-12 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3",
            "transition-[opacity,transform] duration-500 ease-out",
            inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          )}
          style={{ transitionDelay: inView ? "280ms" : undefined }}
        >
          <Edge label="Striking edge" value={strikingEdge} />
          <Edge label="Grappling edge" value={grapplingEdge} />
          <Edge label="Recent form" value={formEdge} />
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          {fight.division ? (
            <p className="text-sm tracking-wide text-mute uppercase">
              {fight.division} · {fight.rounds} rounds
            </p>
          ) : null}
          <ButtonLink
            href={routes.signUp}
            size="lg"
            className="min-w-[12rem] tracking-[0.08em] uppercase hover:scale-[1.02] active:scale-[0.98]"
          >
            View analysis
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function CinematicFighter({
  fighter,
  align,
  active,
  delay,
}: {
  fighter: FightView["fighterA"];
  align: "left" | "right";
  active: boolean;
  delay: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4",
        align === "right" ? "lg:items-end" : "lg:items-start",
        "transition-[opacity,transform] duration-600 ease-out",
        active
          ? "translate-x-0 opacity-100"
          : align === "left"
            ? "-translate-x-8 opacity-0"
            : "translate-x-8 opacity-0",
      )}
      style={{ transitionDelay: active ? `${delay}ms` : undefined }}
    >
      <div className="relative">
        <div
          className={cn(
            "pointer-events-none absolute -inset-6 rounded-full blur-2xl",
            align === "left" ? "bg-accent/20" : "bg-white/10",
          )}
          aria-hidden="true"
        />
        <FighterPortrait
          fighter={fighter}
          name={fighter.name}
          portrait={fighter.portrait}
          variant="featured"
          className="relative h-[12rem] w-[9rem] sm:h-[16rem] sm:w-[11.5rem] lg:h-[20rem] lg:w-[14rem] !rounded-2xl"
        />
      </div>
      <div className={cn("text-center", align === "left" ? "lg:text-left" : "lg:text-right")}>
        <p className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{fighter.lastName}</p>
        <p className="mt-1 text-sm text-mute sm:text-base">{fighter.firstName}</p>
      </div>
    </div>
  );
}

function Edge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/45 px-4 py-5 text-center backdrop-blur-sm">
      <p className="text-[10px] font-semibold tracking-[0.18em] text-mute uppercase">{label}</p>
      <p className="mt-2 text-sm font-semibold tracking-wide text-ink uppercase">{value}</p>
    </div>
  );
}
