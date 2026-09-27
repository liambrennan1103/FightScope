import "server-only";

import { cookies } from "next/headers";
import type { PlanId } from "@/lib/types";
import { getUserPlan } from "@/server/billing/entitlements-store";
import { getSession } from "@/server/auth/get-session";

export const DEV_PLAN_COOKIE = "fs_dev_plan";

const PLANS: PlanId[] = ["free", "starter", "pro"];

export function parsePlanId(value: string | null | undefined): PlanId | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return PLANS.includes(normalized as PlanId) ? (normalized as PlanId) : null;
}

/**
 * Resolve the analysis entitlement for this request.
 *
 * Dev override (never from client query params):
 * - Active when NODE_ENV !== "production", OR FIGHTSCOPE_ALLOW_DEV_PLAN=1
 * - Priority: fs_dev_plan cookie (Account switcher) → FIGHTSCOPE_DEV_PLAN env
 *
 * Production: per-user plan from Stripe-synced entitlements (Supabase + disk).
 * Signed-out / unknown users are Free.
 */
export async function resolveAnalysisPlan(): Promise<PlanId> {
  if (devOverridesEnabled()) {
    try {
      const jar = await cookies();
      const fromCookie = parsePlanId(jar.get(DEV_PLAN_COOKIE)?.value);
      if (fromCookie) return fromCookie;
    } catch {
      /* cookies() unavailable outside request */
    }

    const fromEnv = parsePlanId(process.env.FIGHTSCOPE_DEV_PLAN);
    if (fromEnv) return fromEnv;
  }

  return resolveProductionPlan();
}

async function resolveProductionPlan(): Promise<PlanId> {
  try {
    const user = await getSession();
    if (!user) return "free";

    // Prefer Supabase profiles when the user has a Supabase Auth session.
    try {
      const { getOwnProfile } = await import("@/server/auth/profiles");
      const profile = await getOwnProfile();
      if (profile && profile.id === user.id) {
        return profile.plan;
      }
    } catch {
      /* profiles table may not exist yet */
    }

    return getUserPlan(user.id);
  } catch {
    return "free";
  }
}

export function canGenerateAnalysis(plan: PlanId): boolean {
  return plan === "starter" || plan === "pro";
}

export function canAccessProAnalysis(plan: PlanId): boolean {
  return plan === "pro";
}

export function isDevPlanOverrideActive(): boolean {
  return devOverridesEnabled();
}

function devOverridesEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.FIGHTSCOPE_ALLOW_DEV_PLAN === "1"
  );
}
