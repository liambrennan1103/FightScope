import { NextResponse } from "next/server";
import { parsePaidPlan, priceIdForPlan, siteUrl } from "@/server/billing/plans";
import { getEntitlement } from "@/server/billing/entitlements-store";
import { getStripe } from "@/server/billing/stripe";
import { ensureStripeCustomer } from "@/server/billing/sync";
import { getSession } from "@/server/auth/get-session";
import { routes } from "@/lib/routes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required.", code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Billing is not configured.", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { plan?: string };
    const plan = parsePaidPlan(body.plan);
    if (!plan) {
      return NextResponse.json({ error: "Choose Starter or Pro." }, { status: 400 });
    }

    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      return NextResponse.json(
        {
          error: `Missing Stripe price for ${plan}. Set STRIPE_PRICE_${plan.toUpperCase()}.`,
          code: "PRICE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const existing = await getEntitlement(session.id);
    if (existing && existing.plan === plan && (existing.subscriptionStatus === "active" || existing.subscriptionStatus === "trialing")) {
      return NextResponse.json({ error: "You already have this plan.", code: "ALREADY_SUBSCRIBED" }, { status: 409 });
    }

    const customerId = await ensureStripeCustomer({
      stripe,
      userId: session.id,
      email: session.email,
      name: session.name,
      existing,
    });

    const base = siteUrl();
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: session.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${routes.pricing}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${routes.pricing}?checkout=canceled`,
      allow_promotion_codes: true,
      metadata: {
        fightscope_user_id: session.id,
        plan,
      },
      subscription_data: {
        metadata: {
          fightscope_user_id: session.id,
          plan,
        },
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
    }

    return NextResponse.json({ url: checkout.url, sessionId: checkout.id });
  } catch (error) {
    console.error("[billing] checkout failed", error);
    return NextResponse.json({ error: "Checkout failed." }, { status: 500 });
  }
}
