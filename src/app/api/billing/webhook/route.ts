import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/server/billing/stripe";
import { syncFromCheckoutSession, syncFromSubscription } from "@/server/billing/sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const secret = process.env["STRIPE_WEBHOOK_SECRET"]?.trim();
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET missing." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[billing] webhook signature failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await syncFromCheckoutSession(stripe, session);
        if (!result.ok) console.warn("[billing] checkout sync", result.error);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const result = await syncFromSubscription(subscription);
        if (!result.ok) console.warn("[billing] subscription sync", result.error);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subRef = invoice.subscription;
        if (subRef) {
          const subId = typeof subRef === "string" ? subRef : subRef.id;
          const subscription = await stripe.subscriptions.retrieve(subId);
          await syncFromSubscription(subscription);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[billing] webhook handler failed", error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
