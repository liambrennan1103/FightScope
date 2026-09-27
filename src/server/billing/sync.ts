import "server-only";

import type Stripe from "stripe";
import {
  planFromPriceId,
  parsePaidPlan,
} from "@/server/billing/plans";
import {
  findEntitlementByCustomerId,
  upsertEntitlement,
  type SubscriptionStatus,
  type UserEntitlement,
} from "@/server/billing/entitlements-store";
import type { PlanId } from "@/lib/types";

function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function subscriptionIdOf(
  subscription: string | Stripe.Subscription | null | undefined,
): string | null {
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

function statusOf(status: Stripe.Subscription.Status): SubscriptionStatus {
  return status as SubscriptionStatus;
}

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const end = subscription.current_period_end;
  if (!end) return null;
  return new Date(end * 1000).toISOString();
}

export function userIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  return (
    session.metadata?.fightscope_user_id ||
    session.metadata?.user_id ||
    session.client_reference_id ||
    null
  );
}

export async function syncFromCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; plan?: PlanId; userId?: string; error?: string }> {
  if (session.mode !== "subscription") {
    return { ok: false, error: "Not a subscription checkout." };
  }
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { ok: false, error: "Checkout not paid." };
  }

  const userId = userIdFromCheckoutSession(session);
  if (!userId) return { ok: false, error: "Missing user id on checkout session." };

  let plan = parsePaidPlan(session.metadata?.plan);
  const subId = subscriptionIdOf(session.subscription);
  let subscription: Stripe.Subscription | null = null;

  if (subId) {
    subscription = await stripe.subscriptions.retrieve(subId);
    if (!plan) {
      const priceId = subscription.items.data[0]?.price?.id;
      plan = planFromPriceId(priceId);
    }
  }

  if (!plan) return { ok: false, error: "Could not resolve plan from checkout." };

  const customerId = customerIdOf(session.customer);
  await upsertEntitlement({
    userId,
    email: session.customer_details?.email ?? session.customer_email ?? null,
    plan,
    subscriptionStatus: subscription ? statusOf(subscription.status) : "active",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subId,
    currentPeriodEnd: subscription ? periodEndIso(subscription) : null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
  });

  if (subId) {
    try {
      await stripe.subscriptions.update(subId, {
        metadata: {
          fightscope_user_id: userId,
          plan,
        },
      });
    } catch (err) {
      console.warn("[billing] could not stamp subscription metadata", err);
    }
  }

  return { ok: true, plan, userId };
}

export async function syncFromSubscription(
  subscription: Stripe.Subscription,
): Promise<{ ok: boolean; plan?: PlanId; userId?: string; error?: string }> {
  const priceId = subscription.items.data[0]?.price?.id;
  const planFromPrice = planFromPriceId(priceId);
  const planFromMeta = parsePaidPlan(subscription.metadata?.plan);
  const plan = planFromPrice ?? planFromMeta;

  const customerId = customerIdOf(subscription.customer);
  const userId =
    subscription.metadata?.fightscope_user_id ||
    subscription.metadata?.user_id ||
    (customerId ? (await findEntitlementByCustomerId(customerId))?.userId : null);

  if (!userId) return { ok: false, error: "No user mapped to subscription." };

  const status = statusOf(subscription.status);
  const active = status === "active" || status === "trialing";
  const nextPlan: PlanId = active && plan ? plan : "free";

  await upsertEntitlement({
    userId,
    email: null,
    plan: nextPlan,
    subscriptionStatus: status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: periodEndIso(subscription),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  });

  return { ok: true, plan: nextPlan, userId };
}

export async function ensureStripeCustomer(input: {
  stripe: Stripe;
  userId: string;
  email: string;
  name?: string;
  existing?: UserEntitlement | null;
}): Promise<string> {
  if (input.existing?.stripeCustomerId) {
    return input.existing.stripeCustomerId;
  }

  const customer = await input.stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: { fightscope_user_id: input.userId },
  });

  await upsertEntitlement({
    userId: input.userId,
    email: input.email,
    plan: input.existing?.plan ?? "free",
    subscriptionStatus: input.existing?.subscriptionStatus ?? "none",
    stripeCustomerId: customer.id,
    stripeSubscriptionId: input.existing?.stripeSubscriptionId ?? null,
    currentPeriodEnd: input.existing?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: input.existing?.cancelAtPeriodEnd ?? false,
  });

  return customer.id;
}
