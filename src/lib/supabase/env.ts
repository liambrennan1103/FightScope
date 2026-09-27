import "server-only";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/public-env";

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
  const secret =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) return undefined;

  const publishable = getSupabasePublishableKey();
  if (publishable && secret === publishable) return undefined;
  if (secret.startsWith("sb_publishable_")) return undefined;

  // Legacy: allow SUPABASE_URL when only secret is set with old naming
  return secret;
}

export function isSupabaseAdminConfigured(): boolean {
  const url =
    getSupabaseUrl() ||
    process.env.SUPABASE_URL?.trim();
  return Boolean(url && getSupabaseSecretKey());
}

export function getSupabaseAdminUrl(): string | undefined {
  return getSupabaseUrl() || process.env.SUPABASE_URL?.trim() || undefined;
}
