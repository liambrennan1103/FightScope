import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PlanId } from "@/lib/types";
import { parsePlanId } from "@/server/billing/plans";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/server/supabase/client";

export type SubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export interface UserEntitlement {
  userId: string;
  email?: string | null;
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  updatedAt: string;
}

const ENTITLEMENTS_PATH = path.join(process.cwd(), ".data", "entitlements.json");

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(["active", "trialing"]);

function planFromRow(row: UserEntitlement): PlanId {
  if (!ACTIVE_STATUSES.has(row.subscriptionStatus)) {
    return "free";
  }
  return row.plan === "starter" || row.plan === "pro" ? row.plan : "free";
}

async function readDisk(): Promise<Record<string, UserEntitlement>> {
  try {
    const raw = await readFile(ENTITLEMENTS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, UserEntitlement>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeDisk(map: Record<string, UserEntitlement>) {
  await mkdir(path.dirname(ENTITLEMENTS_PATH), { recursive: true });
  await writeFile(ENTITLEMENTS_PATH, JSON.stringify(map, null, 2), "utf8");
}

function rowFromSupabase(data: Record<string, unknown>): UserEntitlement {
  return {
    userId: String(data.user_id),
    email: (data.email as string | null) ?? null,
    plan: parsePlanId(data.plan as string) ?? "free",
    subscriptionStatus: (data.subscription_status as SubscriptionStatus) ?? "none",
    stripeCustomerId: (data.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (data.stripe_subscription_id as string | null) ?? null,
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    updatedAt: (data.updated_at as string) ?? new Date().toISOString(),
  };
}

export async function getEntitlement(userId: string): Promise<UserEntitlement | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from("user_entitlements")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[entitlements] supabase read failed", error.message);
    } else if (data) {
      return rowFromSupabase(data as Record<string, unknown>);
    }
  }

  const disk = await readDisk();
  return disk[userId] ?? null;
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  const row = await getEntitlement(userId);
  if (!row) return "free";
  return planFromRow(row);
}

export async function upsertEntitlement(
  input: Omit<UserEntitlement, "updatedAt"> & { updatedAt?: string },
): Promise<UserEntitlement> {
  const row: UserEntitlement = {
    ...input,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { error } = await supabase.from("user_entitlements").upsert(
      {
        user_id: row.userId,
        email: row.email ?? null,
        plan: row.plan,
        subscription_status: row.subscriptionStatus,
        stripe_customer_id: row.stripeCustomerId ?? null,
        stripe_subscription_id: row.stripeSubscriptionId ?? null,
        current_period_end: row.currentPeriodEnd ?? null,
        cancel_at_period_end: Boolean(row.cancelAtPeriodEnd),
        updated_at: row.updatedAt,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error("[entitlements] supabase upsert failed", error.message);
      // Fall through to disk so local/dev still works
    }

    // Keep Auth profiles in sync when userId is a UUID (Supabase Auth).
    if (/^[0-9a-f-]{36}$/i.test(row.userId)) {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: row.userId,
          email: row.email ?? null,
          plan: row.plan,
          subscription_status: row.subscriptionStatus,
          stripe_customer_id: row.stripeCustomerId ?? null,
          stripe_subscription_id: row.stripeSubscriptionId ?? null,
          current_period_end: row.currentPeriodEnd ?? null,
          cancel_at_period_end: Boolean(row.cancelAtPeriodEnd),
          updated_at: row.updatedAt,
        },
        { onConflict: "id" },
      );
      if (profileError) {
        console.error("[entitlements] profiles upsert failed", profileError.message);
      }
    }
  }

  const disk = await readDisk();
  disk[row.userId] = row;
  await writeDisk(disk);
  return row;
}

export async function findEntitlementByCustomerId(
  customerId: string,
): Promise<UserEntitlement | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from("user_entitlements")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (!error && data) return rowFromSupabase(data as Record<string, unknown>);
  }

  const disk = await readDisk();
  return Object.values(disk).find((row) => row.stripeCustomerId === customerId) ?? null;
}

export async function setDevEntitlement(userId: string, plan: PlanId, email?: string) {
  return upsertEntitlement({
    userId,
    email: email ?? null,
    plan,
    subscriptionStatus: plan === "free" ? "none" : "active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
}
