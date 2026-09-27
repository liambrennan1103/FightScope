import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { LandingFooter } from "@/components/landing/LandingFinalCta";
import { routes } from "@/lib/routes";

export const metadata = {
  title: "Terms of use",
};

export default function TermsPage() {
  return (
    <div className="landing-scope flex min-h-full flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Terms of use</h1>
        <p className="mt-4 text-sm leading-7 text-mute">
          FightScope provides MMA analysis and informational predictions. Content is not betting
          advice, does not guarantee fight outcomes, and must not be treated as a solicitation to
          wager. By using the service you agree to use it for informational purposes only.
        </p>
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-mute">
          [Company / operator information to be completed before public launch]
        </p>
        <p className="mt-4 text-sm leading-7 text-mute">
          This page is a placeholder summary. Replace with counsel-reviewed terms before public
          launch.
        </p>
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
