"use client";

import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { LandingEyebrow } from "@/components/landing/LandingShell";
import { LandingTapeBar } from "@/components/landing/LandingTapeBar";
import { CountUpPct, useInViewOnce } from "@/components/landing/LandingMotion";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import type { Fighter, Prediction } from "@/lib/types";

export function LandingCompareFeature({
  fighterA,
  fighterB,
  prediction,
}: {
  fighterA: Fighter | null;
  fighterB: Fighter | null;
  prediction: Prediction | null;
}) {
  const { ref, inView } = useInViewOnce<HTMLElement>(0.2);

  if (!fighterA || !fighterB || !prediction) return null;

  const predictedA = prediction.predictedWinnerId === fighterA.id;

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-b border-white/[0.05] bg-surface"
    >
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-16">
        <div className="order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.12] bg-background p-1">
            <div className="relative overflow-hidden rounded-[1.4rem] bg-[#12141a] px-5 py-12 sm:px-10 sm:py-16">
              <div
                className="pointer-events-none absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent"
                aria-hidden="true"
              />

              <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
                <FaceFighter fighter={fighterA} active={inView} side="left" highlighted={predictedA} />

                <div
                  className={cn(
                    "z-10 flex flex-col items-center px-1 text-center transition-[opacity,transform] duration-500 ease-out",
                    inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                  )}
                  style={{ transitionDelay: inView ? "120ms" : undefined }}
                >
                  <p className="font-display text-xl font-semibold tracking-[0.28em] text-accent sm:text-3xl">
                    VS
                  </p>
                  <div className="mt-5 flex flex-col items-center gap-1.5 sm:mt-6">
                    <CountUpPct
                      value={prediction.fighterAWinPct}
                      active={inView}
                      className={cn(
                        "font-display text-3xl font-semibold sm:text-5xl",
                        predictedA ? "text-accent" : "text-ink/45",
                      )}
                    />
                    <CountUpPct
                      value={prediction.fighterBWinPct}
                      active={inView}
                      className={cn(
                        "font-display text-3xl font-semibold sm:text-5xl",
                        !predictedA ? "text-accent" : "text-ink/45",
                      )}
                    />
                  </div>
                </div>

                <FaceFighter
                  fighter={fighterB}
                  active={inView}
                  side="right"
                  highlighted={!predictedA}
                />
              </div>

              <div className="mx-auto mt-10 max-w-md">
                <LandingTapeBar leftPct={prediction.fighterAWinPct} active={inView} heightClassName="h-2.5" />
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <LandingEyebrow>Compare</LandingEyebrow>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            See the advantage
            <br />
            before the bout is booked.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-mute sm:text-lg">
            Put any two fighters on the board — records, physicals, style attributes and a
            FightScope prediction for hypothetical matchups.
          </p>
          <div className="mt-8">
            <ButtonLink href={routes.signUp} size="lg">
              Compare fighters
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaceFighter({
  fighter,
  active,
  side,
  highlighted,
}: {
  fighter: Fighter;
  active: boolean;
  side: "left" | "right";
  highlighted: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 text-center transition-[opacity,transform] duration-600 ease-out",
        active
          ? "translate-x-0 opacity-100"
          : side === "left"
            ? "-translate-x-5 opacity-0"
            : "translate-x-5 opacity-0",
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "pointer-events-none absolute -inset-5 rounded-full blur-2xl",
            highlighted ? "bg-accent/25" : "bg-white/10",
          )}
          aria-hidden="true"
        />
        <FighterPortrait
          fighter={fighter}
          name={fighter.name}
          portrait={fighter.portrait}
          variant="featured"
          ring={highlighted}
          className="relative h-[10rem] w-[7.25rem] sm:h-[14rem] sm:w-[10rem] lg:h-[16rem] lg:w-[11.5rem] !rounded-2xl"
        />
      </div>
      <div>
        <p className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl lg:text-3xl">
          {fighter.lastName}
        </p>
        <p className="mt-1 text-sm text-mute">{fighter.firstName}</p>
      </div>
    </div>
  );
}
