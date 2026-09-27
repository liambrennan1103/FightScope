"use client";

import { LandingAttributeTape, LandingTapeBar } from "@/components/landing/LandingTapeBar";
import { LandingEyebrow } from "@/components/landing/LandingShell";
import { useInViewOnce } from "@/components/landing/LandingMotion";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    n: "01",
    t: "Choose a fight",
    d: "Open an upcoming card or build your own matchup from the roster.",
  },
  {
    n: "02",
    t: "FightScope reads the matchup",
    d: "Physicals, striking, grappling, stance and recent form become one board.",
  },
  {
    n: "03",
    t: "See the prediction",
    d: "Win probability, method lean and the edges that matter before fight night.",
  },
] as const;

export function LandingHowItWorks({
  demoLeftPct,
  demoAttrs,
}: {
  /** Real featured A win % for step-3 tape — null hides the demo bar. */
  demoLeftPct: number | null;
  demoAttrs: Array<{ label: string; left: number; right: number }> | null;
}) {
  const { ref, inView } = useInViewOnce<HTMLElement>(0.15);

  return (
    <section ref={ref} className="border-b border-white/[0.05] bg-[#12141a] py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <Reveal>
          <LandingEyebrow>How it works</LandingEyebrow>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            From card to corner read
          </h2>
        </Reveal>

        <ol className="mt-14 grid list-none gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.n} className="relative isolate min-w-0">
              <p
                className="font-display text-6xl font-semibold tracking-tight text-accent/25 select-none sm:text-7xl"
                aria-hidden="true"
              >
                {step.n}
              </p>
              <h3 className="font-display mt-3 text-xl font-semibold tracking-tight text-ink uppercase sm:text-2xl">
                {step.t}
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-mute">{step.d}</p>

              <div className="mt-6 rounded-lg border border-white/[0.07] bg-background/60 p-3">
                {index === 0 ? <StepChooseVisual active={inView} /> : null}
                {index === 1 ? (
                  <StepAnalyzeVisual active={inView} attrs={demoAttrs} />
                ) : null}
                {index === 2 ? (
                  demoLeftPct != null ? (
                    <div className="space-y-2">
                      <div className="flex justify-between font-mono text-[11px] text-mute">
                        <span className="text-accent">{Math.round(demoLeftPct)}%</span>
                        <span>Win share</span>
                        <span className="text-tape">{Math.round(100 - demoLeftPct)}%</span>
                      </div>
                      <LandingTapeBar leftPct={demoLeftPct} active={inView} heightClassName="h-2" />
                    </div>
                  ) : (
                    <p className="text-[12px] text-mute">Prediction board unlocks with a live card.</p>
                  )
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StepChooseVisual({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_1fr] items-center gap-2 transition-opacity duration-500",
        active ? "opacity-100" : "opacity-40",
      )}
    >
      <div className="rounded border border-white/10 bg-elevated px-2 py-2 text-center font-mono text-[10px] text-ink">
        Fighter A
      </div>
      <span className="text-[10px] font-semibold tracking-[0.2em] text-mute">VS</span>
      <div className="rounded border border-white/10 bg-elevated px-2 py-2 text-center font-mono text-[10px] text-ink">
        Fighter B
      </div>
    </div>
  );
}

function StepAnalyzeVisual({
  active,
  attrs,
}: {
  active: boolean;
  attrs: Array<{ label: string; left: number; right: number }> | null;
}) {
  if (!attrs || attrs.length === 0) {
    return <p className="text-[12px] text-mute">Attribute tape unlocks with a live matchup.</p>;
  }

  return (
    <div className="space-y-2.5">
      {attrs.slice(0, 3).map((row) => (
        <LandingAttributeTape
          key={row.label}
          left={row.left}
          right={row.right}
          label={row.label}
          active={active}
        />
      ))}
    </div>
  );
}
