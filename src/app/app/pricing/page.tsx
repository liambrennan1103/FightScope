import { Suspense } from "react";
import PricingPageClient from "./PricingClient";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-sm text-mute">
          Loading plans…
        </div>
      }
    >
      <PricingPageClient />
    </Suspense>
  );
}
