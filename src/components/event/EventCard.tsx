import Link from "next/link";
import { EventDateBadge } from "@/components/event/EventDateBadge";
import { EventEmptyHeadliner } from "@/components/event/EventEmptyHeadliner";
import { EventTypeBadge } from "@/components/event/EventTypeBadge";
import { EventThemeSurface } from "@/components/event/EventThemeSurface";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import {
  coverageLabel,
  formatEventCity,
  resolveEventHeadliner,
} from "@/lib/event-identity";
import type { Event, FightView } from "@/lib/types";
import { routes } from "@/lib/routes";

export function EventCard({ event, fights }: { event: Event; fights: FightView[] }) {
  const headliner = resolveEventHeadliner(event, fights);
  const showMatchup = headliner.confidence !== "unknown" && headliner.view;

  return (
    <Link href={routes.event(event.slug)} className="group block h-full">
      <EventThemeSurface
        event={event}
        className="flex h-full flex-col p-4 sm:p-5"
      >
        <div className="relative z-[1] flex items-start gap-3">
          <EventDateBadge date={event.date} />
          <div className="min-w-0 flex-1">
            <EventTypeBadge event={event} />
            <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-ink sm:text-base">
              {event.name}
            </h3>
            <p className="mt-1 truncate text-[12px] text-mute">{formatEventCity(event)}</p>
          </div>
        </div>

        <div className="relative z-[1] mt-5 flex flex-1 items-center">
          {showMatchup && headliner.view ? (
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <CardFighter
                name={headliner.view.fighterA.name}
                lastName={headliner.view.fighterA.lastName}
                fighter={headliner.view.fighterA}
              />
              <span className="fs-event-vs justify-self-center scale-90">VS</span>
              <CardFighter
                name={headliner.view.fighterB.name}
                lastName={headliner.view.fighterB.lastName}
                fighter={headliner.view.fighterB}
              />
            </div>
          ) : (
            <div className="w-full">
              <EventEmptyHeadliner fighterA={headliner.knownA} fighterB={headliner.knownB} />
            </div>
          )}
        </div>

        <div className="relative z-[1] mt-5 flex items-center justify-between gap-3 text-[13px]">
          <p className="text-mute">{coverageLabel(fights.length, event.status)}</p>
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-mute transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink">
            View card
            <Arrow />
          </span>
        </div>
      </EventThemeSurface>
    </Link>
  );
}

function CardFighter({
  name,
  lastName,
  fighter,
}: {
  name: string;
  lastName: string;
  fighter: FightView["fighterA"];
}) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <FighterPortrait fighter={fighter} name={name} portrait={fighter.portrait} variant="medium" />
      <p className="mt-2 w-full truncate text-sm font-semibold text-ink">{lastName || name}</p>
    </div>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
