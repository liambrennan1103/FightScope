"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "@/components/providers/AccountProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { routes } from "@/lib/routes";
import { signOutAction } from "@/server/auth/actions";
import type { PlanId } from "@/lib/types";

export default function AccountPage() {
  const { displayName, user, plan, planLabel, setPlan, devPlanOverride, signedIn } = useAccount();
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  async function openPortal() {
    setPortalError(null);
    setPortalBusy(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setPortalError(body.error ?? "Could not open billing portal.");
        setPortalBusy(false);
        return;
      }
      window.location.href = body.url;
    } catch {
      setPortalError("Could not open billing portal.");
      setPortalBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader kicker="Account" title="Your profile" description="Plan, session, and sign-out." />
      <Card>
        <p className="text-sm text-mute">Signed in as</p>
        <p className="mt-1 text-xl font-semibold text-ink">{displayName}</p>
        <p className="mt-1 text-sm text-mute">{user?.email}</p>
        <p className="mt-4 text-sm text-mute">Plan: {planLabel}</p>
        {devPlanOverride ? (
          <p className="mt-2 text-[12px] leading-5 text-mute">
            Dev plan override is active. Switch Free / Starter / Pro below, or set{" "}
            <code className="text-ink">FIGHTSCOPE_DEV_PLAN</code> in{" "}
            <code className="text-ink">.env.local</code>.
          </p>
        ) : null}
        {portalError ? <p className="mt-3 text-sm text-accent">{portalError}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {(["free", "starter", "pro"] as PlanId[]).map((id) => (
            <Button
              key={id}
              variant={plan === id ? "primary" : "secondary"}
              onClick={() => setPlan(id)}
              disabled={!devPlanOverride}
            >
              {id === "free" ? "Free" : id === "starter" ? "Starter" : "Pro"}
            </Button>
          ))}
          {signedIn && plan !== "free" && !devPlanOverride ? (
            <Button variant="secondary" onClick={() => void openPortal()} disabled={portalBusy}>
              {portalBusy ? "Opening…" : "Manage billing"}
            </Button>
          ) : null}
          <Link
            href={routes.pricing}
            className="inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-sm text-ink hover:bg-white/[0.04]"
          >
            View plans
          </Link>
          <form action={signOutAction}>
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
