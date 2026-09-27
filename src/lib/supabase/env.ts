import "server-only";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/public-env";
import { readServerEnv, readServerEnvOr } from "@/server/runtime-env";

export {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseBrowserConfigured,
};

/**
 * Server-only secret / service-role key.
 * Rejects accidental copies of the publishable key.
 */
export function getSupabaseSecretKey(): string | undefined {
  const secret = readServerEnvOr(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
  if (!secret) return undefined;

  const publishable = getSupabasePublishableKey();
  if (publishable && secret === publishable) return undefined;
  if (secret.startsWith("sb_publishable_")) return undefined;

  return secret;
}

export function isSupabaseAdminConfigured(): boolean {
  const url = getSupabaseUrl() || readServerEnv("SUPABASE_URL");
  return Boolean(url && getSupabaseSecretKey());
}

export function getSupabaseAdminUrl(): string | undefined {
  return getSupabaseUrl() || readServerEnv("SUPABASE_URL") || undefined;
}
