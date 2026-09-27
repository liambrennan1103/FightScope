import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { LandingFooter } from "@/components/landing/LandingFinalCta";
import { routes } from "@/lib/routes";

export const metadata = {
  title: "Legal notice",
};

export default function LegalPage() {
  return (
    <div className="landing-scope flex min-h-full flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Legal notice</h1>
        <p className="mt-4 text-sm leading-7 text-mute">
          FightScope is an independent analysis product and is not affiliated with, endorsed by, or
          connected to UFC or Zuffa, LLC. Fight data is presented for informational analysis only.
        </p>
        <p className="mt-4 text-sm leading-7 text-mute">
          This page is a placeholder for publisher identity and contact details. Replace with
          counsel-reviewed legal notice before public launch.
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
