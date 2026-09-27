import Link from "next/link";
import { EventCard } from "@/components/event/EventCard";
import { FightCard } from "@/components/fight/FightCard";
import { FeaturedEventBoard } from "@/components/fight/MatchupBoard";
import { DataFreshness } from "@/components/ui/DataFreshness";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  getCatalog,
  getEventFights,
  getFeaturedFightView,
  getUpcomingFightViews,
} from "@/server/mma/store";
import { routes } from "@/lib/routes";

export const metadata = {
  title: "Home",
};

export const revalidate = 1800;

export default async function AppHomePage() {
  const catalog = await getCatalog();
  const featured = getFeaturedFightView(catalog);
  const upcoming = getUpcomingFightViews(catalog).filter(
    (view) => view.fight.id !== featured?.fight.id,
  );
  const upcomingEvents = catalog.events
    .filter((event) => event.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <div className="space-y-14">
      <PageHeader
        kicker="FightScope"
        title="Upcoming fights"
        description="Browse the next UFC card and pick a fight to analyze — or compare any two fighters."
        action={<DataFreshness lastUpdated={catalog.lastUpdated} stale={catalog.stale} />}
        className="mb-0"
      />

      <section>
        {featured ? (
          <FeaturedEventBoard view={featured} />
        ) : (
          <EmptyState title="No upcoming events" description="Check back when the next card is posted." />
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="The card"
          title="Upcoming fights"
          description="Other matchups on the next events — open one to run an analysis."
        />
        {upcoming.length === 0 ? (
          <p className="text-sm text-mute">No other upcoming fights yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.slice(0, 9).map((view) => (
              <FightCard key={view.fight.id} view={view} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Schedule"
          title="Upcoming events"
          action={
            <Link href={routes.events} className="text-sm text-mute transition-colors duration-200 hover:text-ink">
              All events
            </Link>
          }
        />
        {upcomingEvents.length === 0 ? (
          <EmptyState title="No upcoming events" />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {upcomingEvents.map((event) => {
              const fights = getEventFights(catalog, event);
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  fights={fights}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
