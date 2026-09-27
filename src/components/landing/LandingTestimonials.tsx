import { cn } from "@/lib/cn";

export type LandingTestimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  /** Optional initials for avatar fallback — no remote images required. */
  initials: string;
};

/**
 * Reusable testimonial card. Ready for real quotes.
 * Do not invent win/money claims — stick to understanding and time saved.
 */
export function LandingTestimonialCard({
  item,
  className,
}: {
  item: LandingTestimonial;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "flex h-full min-w-[16rem] max-w-sm flex-col border border-white/[0.08] bg-background/60 p-5 sm:p-6",
        className,
      )}
    >
      <blockquote className="flex-1 text-sm leading-6 text-ink/90">“{item.quote}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center bg-elevated font-mono text-[11px] font-semibold tracking-wide text-amber"
          aria-hidden="true"
        >
          {item.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
          <span className="block truncate text-[12px] text-mute">{item.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Horizontal scroll / grid section. Keep unmounted on the LP until real testimonials exist.
 */
export function LandingTestimonials({
  items,
}: {
  items: LandingTestimonial[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="border-b border-white/[0.05] bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
          From the community
        </p>
        <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          What fight fans say
        </h2>
        <div className="mt-10 flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
          {items.map((item) => (
            <LandingTestimonialCard key={item.id} item={item} className="shrink-0 md:max-w-none" />
          ))}
        </div>
      </div>
    </section>
  );
}
