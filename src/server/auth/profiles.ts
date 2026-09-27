import "server-only";

import type { PlanId } from "@/lib/types";
import { tryCreateSupabaseServerClient } from "@/lib/supabase/server";
import { parsePlanId } from "@/server/billing/plans";

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  plan: PlanId;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export async function getOwnProfile(): Promise<UserProfile | null> {
  const supabase = await tryCreateSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, plan, subscription_status, stripe_customer_id, stripe_subscription_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[profiles] read failed", error.message);
    return null;
  }

  if (!data) {
    // Trigger may lag; upsert own row (RLS insert_own).
    const displayName =
      (user.user_metadata?.display_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Fighter";
    const { data: created, error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          display_name: displayName,
          plan: "free",
          subscription_status: "none",
        },
        { onConflict: "id" },
      )
      .select(
        "id, email, display_name, plan, subscription_status, stripe_customer_id, stripe_subscription_id",
      )
      .maybeSingle();

    if (upsertError || !created) {
      console.error("[profiles] upsert failed", upsertError?.message);
      return null;
    }
    return mapRow(created);
  }

  return mapRow(data);
}

function mapRow(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: (row.email as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    plan: parsePlanId(row.plan as string) ?? "free",
    subscriptionStatus: String(row.subscription_status ?? "none"),
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
  };
}
