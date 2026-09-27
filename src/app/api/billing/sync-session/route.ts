import { NextResponse } from "next/server";
import { getStripe } from "@/server/billing/stripe";
import { syncFromCheckoutSession } from "@/server/billing/sync";
import { getUserPlan } from "@/server/billing/entitlements-store";
import { getSession } from "@/server/auth/get-session";

export const runtime = "nodejs";

/**
 * Client success-page fallback when webhooks are delayed (e.g. local Stripe CLI).
 * Still verifies the Checkout Session with Stripe — never trusts the client alone.
 */
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
    }

    const body = (await request.json()) as { sessionId?: string };
    if (!body.sessionId || typeof body.sessionId !== "string" || body.sessionId.length > 200) {
      return NextResponse.json({ error: "sessionId required." }, { status: 400 });
    }

    const checkout = await stripe.checkout.sessions.retrieve(body.sessionId);
    const owner =
      checkout.metadata?.fightscope_user_id ||
      checkout.client_reference_id ||
      null;
    if (owner !== user.id) {
      return NextResponse.json({ error: "Session does not belong to this user." }, { status: 403 });
    }

    const result = await syncFromCheckoutSession(stripe, checkout);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Sync failed." }, { status: 400 });
    }

    const plan = await getUserPlan(user.id);
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    console.error("[billing] sync-session failed", error);
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}
