import { notFound } from "next/navigation";
import { EventFightRow } from "@/components/event/EventFightRow";
import { EventHero } from "@/components/event/EventHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { groupEventCard, resolveEventHeadliner } from "@/lib/event-identity";
import { getCatalog, getEventFights } from "@/server/mma/store";

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ event: string }>;
}) {
  const { event: slug } = await params;
  const catalog = await getCatalog();
  const event = catalog.events.find((item) => item.slug === slug);
  return { title: event ? event.name : "Event" };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ event: string }>;
}) {
  const { event: slug } = await params;
  const catalog = await getCatalog();
  const event = catalog.events.find((item) => item.slug === slug);
  if (!event) notFound();

  const fights = getEventFights(catalog, event);
  const headliner = resolveEventHeadliner(event, fights);
  const grouped = groupEventCard(fights, headliner.confidence === "unknown" ? null : headliner.view);

  return (
    <div className="space-y-10">
      <EventHero event={event} fights={fights} />

      {fights.length === 0 ? (
        <EmptyState title="Card not posted" description="FightScope will list matchups when the card is confirmed." />
      ) : grouped.showSections ? (
        <>
          {grouped.mainCard.length > 0 ? (
            <section>
              <SectionHeader title="Main card" />
              <div className="space-y-2">
                {grouped.mainCard.map((view) => (
                  <EventFightRow key={view.fight.id} view={view} />
                ))}
              </div>
            </section>
          ) : null}
          {grouped.prelims.length > 0 ? (
            <section>
              <SectionHeader title="Prelims" />
              <div className="space-y-2">
                {grouped.prelims.map((view) => (
                  <EventFightRow key={view.fight.id} view={view} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section>
          <SectionHeader title="Fight card" />
          <div className="space-y-2">
            {(grouped.headliner ? fights.filter((view) => view.fight.id !== grouped.headliner?.fight.id) : fights).map(
              (view) => (
                <EventFightRow key={view.fight.id} view={view} />
              ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
