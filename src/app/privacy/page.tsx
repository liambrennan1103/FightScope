import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { LandingFooter } from "@/components/landing/LandingFinalCta";
import { routes } from "@/lib/routes";

export const metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="landing-scope flex min-h-full flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Privacy policy</h1>
        <p className="mt-4 text-sm leading-7 text-mute">
          FightScope processes account and usage data needed to operate the product (authentication,
          preferences and service analytics). We do not sell personal data for advertising.
        </p>
        <p className="mt-4 text-sm leading-7 text-mute">
          This page is a placeholder summary. Replace with counsel-reviewed privacy policy before
          public launch.
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
