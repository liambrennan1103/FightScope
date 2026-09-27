import { LandingEyebrow } from "@/components/landing/LandingShell";
import { Reveal } from "@/components/ui/Reveal";

const VARIABLES = [
  { id: "striking", label: "Striking" },
  { id: "power", label: "Power" },
  { id: "grappling", label: "Grappling" },
  { id: "wrestling", label: "Wrestling" },
  { id: "cardio", label: "Cardio" },
  { id: "reach", label: "Reach & height" },
  { id: "stance", label: "Stance" },
  { id: "form", label: "Recent form" },
] as const;

/**
 * Methodology — live roster counts only. No invented source totals or accuracy claims.
 * Refresh cadence stated from product revalidate (30 min), not a fabricated scrape count.
 */
export function LandingMethodology({
  fighterCount,
  upcomingEventCount,
  divisionCount,
}: {
  fighterCount: number;
  upcomingEventCount: number;
  divisionCount: number;
}) {
  return (
    <section id="methodology" className="border-b border-white/[0.05] bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <Reveal>
          <LandingEyebrow>Methodology</LandingEyebrow>
          <h2 className="font-display mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.1rem] lg:leading-[1.08]">
            How FightScope builds a matchup read
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-mute sm:text-lg">
            Predictions are structured from real fighter inputs — not a black-box tip. Each board
            combines physical profiles, style attributes and recent performances into a readable
            win probability and method lean.
          </p>
        </Reveal>

        <Reveal delayMs={60}>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <Metric value={`${fighterCount}+`} label="Fighters tracked" />
            <Metric value={`${upcomingEventCount}`} label="Upcoming events on the board" />
            <Metric value={`${divisionCount}`} label="Divisions covered" />
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="mt-12">
            <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
              Variables in the matchup model
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {VARIABLES.map((item) => (
                <li
                  key={item.id}
                  className="border border-white/[0.08] bg-background/70 px-3 py-1.5 text-sm text-ink/90"
                >
                  {item.label}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-mute">
              Roster and card data sync from UFC event feeds on a regular refresh cycle (about every
              30 minutes in production). FightScope is an analysis product — estimates, not
              guarantees of fight outcomes.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-white/[0.08] bg-background/50 px-5 py-6">
      <p className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        {value}
      </p>
      <p className="mt-2 text-[12px] tracking-[0.12em] text-mute uppercase">{label}</p>
    </div>
  );
}
