import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { LandingEyebrow } from "@/components/landing/LandingShell";
import { Reveal } from "@/components/ui/Reveal";
import { classifyEventKind } from "@/lib/event-identity";
import type { Event, Fighter } from "@/lib/types";

const CATEGORIES = [
  { id: "ppv", label: "PPV" },
  { id: "fight-night", label: "Fight Night" },
  { id: "contender", label: "Contender Series" },
  { id: "noche", label: "Noche" },
] as const;

/** Coverage sits after features; shares steel surface language with methodology. */
export function LandingCoverage({
  fighterCount,
  upcomingEventCount,
  divisionCount,
  events,
  fighters,
}: {
  fighterCount: number;
  upcomingEventCount: number;
  divisionCount: number;
  events: Event[];
  fighters: Fighter[];
}) {
  const present = new Set(events.map((event) => classifyEventKind(event)));
  const marquee = fighters.slice(0, 16);

  return (
    <section className="relative overflow-hidden border-b border-white/[0.05] bg-surface">
      <div className="relative mx-auto max-w-[1280px] px-4 py-20 text-center sm:px-6 sm:py-28">
        <Reveal>
          <LandingEyebrow>Coverage</LandingEyebrow>
          <h2 className="font-display mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
            From main events
            <br />
            to new prospects.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-mute sm:text-lg">
            Track the roster and upcoming cards — main events, Fight Nights, Contender Series and
            more — in one place.
          </p>
        </Reveal>

        <Reveal delayMs={70}>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
            <Stat label="Fighters tracked" value={`${fighterCount}+`} />
            <Stat label="Upcoming events" value={`${upcomingEventCount}`} />
            <Stat label="Divisions covered" value={`${divisionCount}`} />
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-2.5">
            {CATEGORIES.map((cat) => (
              <span
                key={cat.id}
                className={`border px-5 py-2.5 text-[12px] font-semibold tracking-[0.16em] uppercase ${
                  present.has(cat.id)
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-white/10 text-mute"
                }`}
              >
                {cat.label}
              </span>
            ))}
          </div>
        </Reveal>
      </div>

      {marquee.length > 0 ? (
        <div className="relative pb-16 sm:pb-20" aria-hidden="true">
          <div className="fs-marquee-mask overflow-hidden">
            <div className="fs-marquee flex w-max gap-3">
              {[...marquee, ...marquee].map((fighter, index) => (
                <div
                  key={`${fighter.id}-${index}`}
                  className="shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/40"
                >
                  <FighterPortrait
                    fighter={fighter}
                    name={fighter.name}
                    portrait={fighter.portrait}
                    variant="hero"
                    className="!rounded-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.08] bg-background/50 px-5 py-7">
      <p className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        {value}
      </p>
      <p className="mt-2 text-[12px] tracking-[0.14em] text-mute uppercase">{label}</p>
    </div>
  );
}
