"use server";

import { cookies } from "next/headers";
import { DEV_PLAN_COOKIE, parsePlanId } from "@/server/entitlements";
import { setDevEntitlement } from "@/server/billing/entitlements-store";
import { getSession } from "@/server/auth/get-session";
import type { PlanId } from "@/lib/types";

/**
 * Development-only plan switcher (cookie + entitlement store).
 * Ignored in production unless FIGHTSCOPE_ALLOW_DEV_PLAN=1.
 */
export async function setDevPlanAction(plan: PlanId): Promise<{ ok: boolean; plan: PlanId | null }> {
  const allow =
    process.env.NODE_ENV !== "production" || process.env.FIGHTSCOPE_ALLOW_DEV_PLAN === "1";
  if (!allow) {
    return { ok: false, plan: null };
  }
  const parsed = parsePlanId(plan);
  if (!parsed) return { ok: false, plan: null };

  const jar = await cookies();
  jar.set(DEV_PLAN_COOKIE, parsed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  try {
    const user = await getSession();
    if (user) {
      await setDevEntitlement(user.id, parsed, user.email);
    }
  } catch {
    /* store optional for anonymous local override */
  }

  return { ok: true, plan: parsed };
}
