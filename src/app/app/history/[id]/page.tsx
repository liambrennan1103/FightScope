import { HistoryDetailClient } from "@/components/history/HistoryDetailClient";
import { getCatalog } from "@/server/mma/store";

export const metadata = { title: "Saved analysis" };
export const revalidate = 1800;

export default async function HistoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const catalog = await getCatalog();
  const eventsById = new Map(catalog.events.map((event) => [event.id, event]));

  const fights = catalog.fights.map((fight) => {
    const event = eventsById.get(fight.eventId);
    return {
      slug: fight.slug,
      status: fight.status,
      outcome: fight.outcome,
      division: fight.division,
      rounds: fight.rounds,
      eventId: fight.eventId,
      isTitle: fight.isTitle,
      titleLabel: fight.titleLabel,
      eventName: event?.name,
      eventDate: event?.date,
      eventSlug: event?.slug,
    };
  });

  return <HistoryDetailClient id={id} fighters={catalog.fighters} fights={fights} />;
}
