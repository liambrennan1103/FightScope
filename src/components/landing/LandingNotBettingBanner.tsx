import Link from "next/link";

/** Pre-pricing reassurance — not only FAQ. */
export function LandingNotBettingBanner() {
  return (
    <section className="border-b border-white/[0.05] bg-[#12141a]">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-10">
        <div className="max-w-2xl">
          <p className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
            FightScope is not a betting platform.
          </p>
          <p className="mt-1.5 text-sm leading-6 text-mute">
            We build fight analysis and matchup reads so you understand the bout. We do not place,
            accept or broker bets — and we do not guarantee fight results.
          </p>
        </div>
        <Link
          href="#faq"
          className="shrink-0 text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Read the FAQ
        </Link>
      </div>
    </section>
  );
}
