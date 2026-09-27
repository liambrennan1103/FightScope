/**
 * Compact live-metrics strip. Accuracy % and user counts are intentionally omitted
 * until verified production metrics exist — never fill with estimates.
 */
export function LandingSocialProof({
  fighterCount,
  upcomingEventCount,
  divisionCount,
}: {
  fighterCount: number;
  upcomingEventCount: number;
  divisionCount: number;
}) {
  const items = [
    { value: `${fighterCount}+`, label: "fighters tracked" },
    { value: `${upcomingEventCount}`, label: "upcoming events" },
    { value: `${divisionCount}`, label: "divisions covered" },
  ];

  return (
    <section className="border-b border-white/[0.05] bg-surface">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline justify-center gap-2.5 px-4 py-5 sm:py-6"
          >
            <span className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {item.value}
            </span>
            <span className="text-[12px] tracking-[0.08em] text-mute uppercase">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
