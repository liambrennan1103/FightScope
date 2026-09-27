import { notFound } from "next/navigation";
import { FightWorkspace } from "@/components/fight/FightWorkspace";
import { getFightView } from "@/server/mma/store";

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fight: string }>;
}) {
  const { fight: slug } = await params;
  const view = await getFightView(slug);
  return {
    title: view ? `${view.fighterA.lastName} vs ${view.fighterB.lastName}` : "Fight",
  };
}

export default async function FightPage({
  params,
}: {
  params: Promise<{ fight: string }>;
}) {
  const { fight: slug } = await params;
  const view = await getFightView(slug);
  if (!view) notFound();

  const { fight, event, fighterA, fighterB } = view;
  const completed = fight.status === "completed";
  const kicker = completed
    ? "Completed"
    : fight.isTitle
      ? fight.titleLabel ?? "Title fight"
      : fight.cardSegment === "main-event"
        ? "Main event"
        : "Bout";

  return (
    <FightWorkspace
      fighterA={fighterA}
      fighterB={fighterB}
      fight={fight}
      eventName={event.name}
      eventDate={event.date}
      eventSlug={event.slug}
      titleLabel={fight.isTitle ? fight.titleLabel ?? "Title" : null}
      kicker={kicker}
    />
  );
}
