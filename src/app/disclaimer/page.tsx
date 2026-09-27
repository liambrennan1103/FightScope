import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { LandingFooter } from "@/components/landing/LandingFinalCta";
import { routes } from "@/lib/routes";

export const metadata = {
  title: "Disclaimer",
};

export default function DisclaimerPage() {
  return (
    <div className="landing-scope flex min-h-full flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Disclaimer</h1>
        <div className="mt-4 space-y-4 text-sm leading-7 text-mute">
          <p>
            FightScope provides probabilistic MMA analysis and informational content. Model outputs
            are estimates based on available fighter and bout data — they are not guarantees of fight
            outcomes.
          </p>
          <p>
            FightScope does not place, accept, or broker bets. Nothing on this site is a solicitation
            to wager, and FightScope does not determine official fight results.
          </p>
          <p>
            Always treat predictions as analytical context. Past performances and model scores do not
            ensure future results.
          </p>
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
            [Company / operator information to be completed before public launch]
          </p>
          <p>
            This page is a structural placeholder for production. Replace with counsel-reviewed
            disclaimer language before public launch where required.
          </p>
        </div>
        <p className="mt-8">
          <Link href={routes.landing} className="text-sm font-semibold text-accent hover:underline">
            ← Back to FightScope
          </Link>
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
