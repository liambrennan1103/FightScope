import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAdminUrl,
  getSupabaseSecretKey,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/env";

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return isSupabaseAdminConfigured();
}

/**
 * Service-role client for analysis cache / webhooks / privileged writes.
 * Returns null when the secret key is missing or is accidentally the publishable key.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) return null;
  if (cached) return cached;
  cached = createClient(getSupabaseAdminUrl()!, getSupabaseSecretKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      "Supabase admin is not configured. Set SUPABASE_SECRET_KEY to the service-role/secret key (not the publishable key).",
    );
  }
  return client;
}
