import { EventCard } from "@/components/event/EventCard";
import { FeaturedEventCard } from "@/components/event/FeaturedEventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { pickNextEvent } from "@/lib/event-identity";
import { getCatalog, getEventFights } from "@/server/mma/store";

export const metadata = { title: "Events" };
export const revalidate = 1800;

export default async function EventsPage() {
  const catalog = await getCatalog();
  const upcoming = catalog.events
    .filter((event) => event.status === "upcoming")
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const completed = catalog.events.filter((event) => event.status === "completed");
  const next = pickNextEvent(upcoming);
  const rest = upcoming.filter((event) => event.id !== next?.id);

  return (
    <div className="space-y-12">
      <PageHeader
        kicker="Calendar"
        title="Events"
        description="Fight nights, numbered cards, and recent results."
        className="mb-0"
      />

      {next ? (
        <section>
          <FeaturedEventCard event={next} fights={getEventFights(catalog, next)} />
        </section>
      ) : upcoming.length === 0 ? (
        <EmptyState title="No upcoming events" description="Completed cards are listed below." />
      ) : null}

      {rest.length > 0 ? (
        <section>
          <SectionHeader eyebrow="Upcoming" title="The schedule" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((event) => (
              <EventCard key={event.id} event={event} fights={getEventFights(catalog, event)} />
            ))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section>
          <SectionHeader eyebrow="Archive" title="Recent results" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {completed
              .slice()
              .reverse()
              .slice(0, 9)
              .map((event) => (
                <EventCard key={event.id} event={event} fights={getEventFights(catalog, event)} />
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
