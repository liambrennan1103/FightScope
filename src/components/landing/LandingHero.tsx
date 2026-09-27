import { LandingHeroSearch } from "@/components/landing/LandingHeroSearch";
import { LandingTapeBar } from "@/components/landing/LandingTapeBar";
import { ButtonLink } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { Event, SearchFighter } from "@/lib/types";

export function LandingHero({
  fighters,
  nextEvent,
  fighterCount,
  upcomingEventCount,
  divisionCount,
  heroTapeLeftPct,
}: {
  fighters: SearchFighter[];
  nextEvent: Event | null;
  fighterCount: number;
  upcomingEventCount: number;
  divisionCount: number;
  /** Real featured-matchup A win % — omit bar if null (no invented share). */
  heroTapeLeftPct: number | null;
}) {
  const eyebrow = nextEvent
    ? `Next event · ${nextEvent.name} · ${formatDate(nextEvent.date, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : "Live UFC cards · updated regularly";

  return (
    <section className="relative overflow-hidden border-b border-white/[0.05]">
      {heroTapeLeftPct != null ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-40 sm:h-32"
          aria-hidden="true"
        >
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
            <LandingTapeBar
              leftPct={heroTapeLeftPct}
              active
              showTick
              heightClassName="h-3"
              aria-label={`Featured matchup share ${Math.round(heroTapeLeftPct)}% to ${Math.round(100 - heroTapeLeftPct)}%`}
            />
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto max-w-[1100px] px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-20 sm:pb-24">
        <p className="inline-flex max-w-full items-center gap-2 border border-amber/35 bg-amber/10 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.12em] text-amber uppercase">
          <span className="truncate">{eyebrow}</span>
        </p>

        <h1 className="font-display mx-auto mt-8 max-w-4xl text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-ink sm:text-6xl lg:text-[4.15rem]">
          Read the matchup
          <br />
          <span className="text-accent">before the cage door closes.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-mute sm:text-lg">
          FightScope turns records, physicals, style and recent form into clear win probabilities
          and matchup breakdowns — so you understand the fight, not just the odds board.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href={routes.signUp} size="lg" className="min-w-[11.5rem]">
            Analyze a fight
          </ButtonLink>
          <ButtonLink
            href="#featured-prediction"
            variant="secondary"
            size="lg"
            className="min-w-[11.5rem]"
          >
            See an example
          </ButtonLink>
        </div>

        <p className="mx-auto mt-6 max-w-2xl font-mono text-[12px] leading-5 tracking-wide text-mute sm:text-[13px]">
          <span className="text-ink/90">{fighterCount}+ fighters tracked</span>
          <span className="mx-2 text-line-strong">·</span>
          <span className="text-ink/90">{upcomingEventCount} upcoming events</span>
          <span className="mx-2 text-line-strong">·</span>
          <span className="text-ink/90">{divisionCount} divisions</span>
        </p>

        <div className="mt-10">
          <LandingHeroSearch fighters={fighters} />
        </div>
      </div>
    </section>
  );
}
