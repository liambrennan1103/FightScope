import "server-only";

import type { PlanId } from "@/lib/types";

const PLANS: PlanId[] = ["free", "starter", "pro"];

export function parsePaidPlan(value: string | null | undefined): "starter" | "pro" | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "starter" || normalized === "pro") return normalized;
  return null;
}

export function parsePlanId(value: string | null | undefined): PlanId | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return PLANS.includes(normalized as PlanId) ? (normalized as PlanId) : null;
}

/** Active Stripe price IDs — set via env in production. */
export function priceIdForPlan(plan: "starter" | "pro"): string | null {
  if (plan === "starter") return process.env.STRIPE_PRICE_STARTER?.trim() || null;
  return process.env.STRIPE_PRICE_PRO?.trim() || null;
}

export function planFromPriceId(priceId: string | null | undefined): "starter" | "pro" | null {
  if (!priceId) return null;
  const starter = process.env.STRIPE_PRICE_STARTER?.trim();
  const pro = process.env.STRIPE_PRICE_PRO?.trim();
  const starterLegacy = (process.env.STRIPE_PRICE_STARTER_LEGACY ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const proLegacy = (process.env.STRIPE_PRICE_PRO_LEGACY ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (priceId === starter || starterLegacy.includes(priceId)) return "starter";
  if (priceId === pro || proLegacy.includes(priceId)) return "pro";
  return null;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env["STRIPE_SECRET_KEY"]?.trim());
}

export function siteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.URL?.trim() || // Netlify
    process.env.DEPLOY_PRIME_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}
