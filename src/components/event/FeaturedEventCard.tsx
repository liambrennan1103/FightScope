import Link from "next/link";
import { EventDateBadge } from "@/components/event/EventDateBadge";
import { EventEmptyHeadliner } from "@/components/event/EventEmptyHeadliner";
import { EventTypeBadge } from "@/components/event/EventTypeBadge";
import { EventThemeSurface } from "@/components/event/EventThemeSurface";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { buttonClass } from "@/components/ui/Button";
import {
  coverageLabel,
  formatEventPlace,
  resolveEventHeadliner,
} from "@/lib/event-identity";
import { formatEventDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Event, FightView } from "@/lib/types";
import { routes } from "@/lib/routes";

export function FeaturedEventCard({ event, fights }: { event: Event; fights: FightView[] }) {
  const headliner = resolveEventHeadliner(event, fights);
  const view = headliner.view;
  const showMatchup = headliner.confidence !== "unknown" && view;

  return (
    <Link href={routes.event(event.slug)} className="group block">
      <EventThemeSurface
        event={event}
        intensity="featured"
        className="p-5 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--event-accent)] uppercase">
            Next event
          </p>
          <EventTypeBadge event={event} />
        </div>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <EventDateBadge date={event.date} />
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl lg:text-[2.1rem]">
                {event.name}
              </h2>
              <p className="mt-2 text-sm text-mute">{formatEventDateTime(event.date)}</p>
              <p className="mt-1 text-sm text-mute">{formatEventPlace(event)}</p>
              <p className="mt-2 text-[13px] text-mute">{coverageLabel(fights.length, event.status)}</p>
            </div>
          </div>
          <span className={cn(buttonClass("primary"), "shrink-0 self-start lg:self-center")}>View card</span>
        </div>

        <div className="mt-8 sm:mt-10">
          {showMatchup && view ? (
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:gap-8 lg:gap-10">
              <FeaturedFighter fighter={view.fighterA} align="left" />
              <span className="fs-event-vs justify-self-center">VS</span>
              <FeaturedFighter fighter={view.fighterB} align="right" />
            </div>
          ) : (
            <EventEmptyHeadliner
              fighterA={headliner.knownA}
              fighterB={headliner.knownB}
              size="hero"
            />
          )}
        </div>
      </EventThemeSurface>
    </Link>
  );
}

function FeaturedFighter({
  fighter,
  align,
}: {
  fighter: FightView["fighterA"];
  align: "left" | "right";
}) {
  return (
    <div
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
    </div>
  );
}
