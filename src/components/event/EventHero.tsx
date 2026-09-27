import Link from "next/link";
import { EventDateBadge } from "@/components/event/EventDateBadge";
import { EventEmptyHeadliner } from "@/components/event/EventEmptyHeadliner";
import { EventTypeBadge } from "@/components/event/EventTypeBadge";
import { EventThemeSurface } from "@/components/event/EventThemeSurface";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { ButtonLink } from "@/components/ui/Button";
import { formatEventDateTime } from "@/lib/format";
import {
  coverageLabel,
  formatEventPlace,
  resolveEventHeadliner,
} from "@/lib/event-identity";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import type { Event, FightView } from "@/lib/types";

export function EventHero({ event, fights }: { event: Event; fights: FightView[] }) {
  const headliner = resolveEventHeadliner(event, fights);
  const view = headliner.view;
  const showMatchup = headliner.confidence !== "unknown" && view;
  const completed = event.status === "completed";

  return (
    <EventThemeSurface event={event} intensity="featured" className="p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <EventTypeBadge event={event} />
        {event.promotion ? (
          <span className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
            {event.promotion}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-4xl">{event.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute">
            <span>{formatEventDateTime(event.date)}</span>
            <span className="text-white/20">·</span>
            <span>{formatEventPlace(event)}</span>
          </div>
        </div>
        <EventDateBadge date={event.date} />
      </div>

      <p className="mt-3 text-[13px] text-mute">{coverageLabel(fights.length, event.status)}</p>

      <div className="mt-8 sm:mt-10">
        {showMatchup && view ? (
          <>
            <p className="mb-5 text-center text-[11px] font-semibold tracking-[0.18em] text-mute uppercase">
              {completed ? "Main event result" : "Main event"}
            </p>
            <div className="sm:hidden">
              <div className="grid grid-cols-2 items-end gap-4">
                <HeroFighter fighter={view.fighterA} align="left" />
                <HeroFighter fighter={view.fighterB} align="right" />
              </div>
              <div className="mt-4 flex justify-center">
                <span className="fs-event-vs">VS</span>
              </div>
            </div>
            <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-8 lg:gap-10">
              <HeroFighter fighter={view.fighterA} align="left" />
              <span className="fs-event-vs justify-self-center">VS</span>
              <HeroFighter fighter={view.fighterB} align="right" />
            </div>
            {view.fight.isTitle && view.fight.titleLabel ? (
              <p className="mt-5 text-center text-[12px] text-mute">{view.fight.titleLabel}</p>
            ) : view.fight.division ? (
              <p className="mt-5 text-center text-[12px] text-mute">
                {view.fight.division} · {view.fight.rounds} rounds
              </p>
            ) : null}
            {view.fight.status === "upcoming" ? (
              <div className="mt-6 flex justify-center">
                <ButtonLink href={routes.fight(view.fight.slug)} size="sm">
                  Open analysis
                </ButtonLink>
              </div>
            ) : view.fight.status === "completed" && view.fight.outcome ? (
              <p className="mt-5 text-center text-sm text-ink">
                {view.fight.outcome.winnerId === view.fighterA.id
                  ? view.fighterA.name
                  : view.fight.outcome.winnerId === view.fighterB.id
                    ? view.fighterB.name
                    : "Draw"}
                {view.fight.outcome.method ? ` · ${view.fight.outcome.method}` : ""}
                {view.fight.outcome.round ? ` · R${view.fight.outcome.round}` : ""}
              </p>
            ) : null}
          </>
        ) : fights.length === 0 ? (
          <EventEmptyHeadliner size="hero" />
        ) : (
          <EventEmptyHeadliner fighterA={headliner.knownA} fighterB={headliner.knownB} size="hero" />
        )}
      </div>
    </EventThemeSurface>
  );
}

function HeroFighter({
  fighter,
  align,
}: {
  fighter: FightView["fighterA"];
  align: "left" | "right";
}) {
  return (
    <Link
      href={routes.fighter(fighter.slug)}
      className={cn(
        "flex min-w-0 flex-col items-center gap-3 sm:flex-row sm:gap-5",
        align === "right" && "sm:flex-row-reverse",
      )}
    >
      <FighterPortrait fighter={fighter} name={fighter.name} portrait={fighter.portrait} variant="hero" />
      <div className={cn("min-w-0 text-center", align === "left" ? "sm:text-left" : "sm:text-right")}>
        <p className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl lg:text-3xl">
          {fighter.lastName}
        </p>
        <p className="truncate text-sm text-mute">{fighter.firstName}</p>
      </div>
    </Link>
  );
}
