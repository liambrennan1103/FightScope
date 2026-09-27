import "server-only";

import Stripe from "stripe";
import { isStripeConfigured } from "@/server/billing/plans";

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) return null;
  if (cached) return cached;
  cached = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
