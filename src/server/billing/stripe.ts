import "server-only";

import Stripe from "stripe";
import { isStripeConfigured } from "@/server/billing/plans";
import { readServerEnv } from "@/server/runtime-env";

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) return null;
  if (cached) return cached;
  const key = readServerEnv("STRIPE_SECRET_KEY");
  if (!key) return null;
  cached = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
  return cached;
}

export function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
  }
  return stripe;
}
