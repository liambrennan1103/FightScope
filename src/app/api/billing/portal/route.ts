import { NextResponse } from "next/server";
import { getEntitlement } from "@/server/billing/entitlements-store";
import { getStripe } from "@/server/billing/stripe";
import { siteUrl } from "@/server/billing/plans";
import { getSession } from "@/server/auth/get-session";
import { routes } from "@/lib/routes";

export const runtime = "nodejs";

export async function POST() {
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

    const entitlement = await getEntitlement(session.id);
    if (!entitlement?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing customer on file.", code: "NO_CUSTOMER" },
        { status: 400 },
      );
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: entitlement.stripeCustomerId,
      return_url: `${siteUrl()}${routes.account}`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("[billing] portal failed", error);
    return NextResponse.json({ error: "Could not open billing portal." }, { status: 500 });
  }
}
