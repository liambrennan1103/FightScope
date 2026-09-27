"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PRICING_TIERS } from "@/data/pricing";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import type { PlanId } from "@/lib/types";

export default function PricingClient() {
  const { plan, setPlan, devPlanOverride, signedIn } = useAccount();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncCheckout = useCallback(
    async (sessionId: string) => {
      setMessage("Confirming your subscription…");
      try {
        const res = await fetch("/api/billing/sync-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const body = (await res.json()) as { plan?: PlanId; error?: string };
        if (!res.ok) {
          setError(body.error ?? "Could not confirm payment.");
          setMessage(null);
          return;
        }
        setMessage("Subscription active. Refreshing your plan…");
        router.refresh();
      } catch {
        setError("Could not confirm payment.");
        setMessage(null);
      }
    },
    [router],
  );

  useEffect(() => {
    const status = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (status === "canceled") {
      setMessage("Checkout canceled — your plan was not changed.");
      return;
    }
    if (status === "success" && sessionId) {
      void syncCheckout(sessionId);
    }
  }, [searchParams, syncCheckout]);

  async function startCheckout(tierId: PlanId) {
    setError(null);
    setMessage(null);

    if (tierId === "free") {
      if (devPlanOverride) setPlan("free");
      return;
    }

    if (devPlanOverride) {
      setPlan(tierId);
      return;
    }

    if (!signedIn) {
      window.location.href = `${routes.signIn}?next=${encodeURIComponent(routes.pricing)}`;
      return;
    }

    setBusyPlan(tierId);
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: tierId }),
        });
        const body = (await res.json()) as { url?: string; error?: string; code?: string };
        if (!res.ok || !body.url) {
          setError(body.error ?? "Could not start checkout.");
          setBusyPlan(null);
          return;
        }
        window.location.href = body.url;
      } catch {
        setError("Could not start checkout.");
        setBusyPlan(null);
      }
    });
  }

  async function openPortal() {
    setError(null);
    setBusyPlan("pro");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setError(body.error ?? "Could not open billing portal.");
        setBusyPlan(null);
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Could not open billing portal.");
      setBusyPlan(null);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Plans"
        title="Pricing"
        description="Free to browse. Starter for Analyze Fight. Pro for full FightScope depth."
      />

      {message ? (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-ink">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const current = plan === tier.id;
          const loading = pending && busyPlan === tier.id;
          return (
            <Card key={tier.id} className={cn(tier.highlighted && "border-accent/25")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">{tier.name}</h2>
                    {tier.highlighted ? <Badge tone="pro">Pro</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-mute">{tier.description}</p>
                </div>
                {current ? <Badge>Current</Badge> : null}
              </div>
              <p className="mt-5">
                <span className="text-4xl font-semibold tracking-tight text-ink">{tier.priceLabel}</span>
                {tier.cadence ? <span className="ml-1 text-sm text-mute">/{tier.cadence}</span> : null}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-ink">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full min-h-11"
                variant={tier.highlighted ? "primary" : "secondary"}
                onClick={() => void startCheckout(tier.id)}
                disabled={current || loading || (busyPlan !== null && busyPlan !== tier.id)}
              >
                {current ? "Selected" : loading ? "Redirecting…" : tier.cta}
              </Button>
            </Card>
          );
        })}
      </div>

      {signedIn && plan !== "free" && !devPlanOverride ? (
        <div className="mt-6 text-center">
          <Button variant="ghost" size="sm" onClick={() => void openPortal()} disabled={busyPlan !== null}>
            Manage billing
          </Button>
        </div>
      ) : null}

      {devPlanOverride ? (
        <p className="mt-4 text-center text-xs text-mute">
          Dev plan override is active — buttons switch local entitlement without Stripe.
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm text-mute">
        <Link href={routes.account} className="text-ink hover:text-accent">
          Account
        </Link>
      </p>
    </div>
  );
}
