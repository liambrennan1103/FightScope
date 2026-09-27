"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/public-env";

/** Browser Supabase client (publishable key only). */
export function createSupabaseBrowserClient() {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  return createBrowserClient(getSupabaseUrl()!, getSupabasePublishableKey()!);
}

export function tryCreateSupabaseBrowserClient() {
  if (!isSupabaseBrowserConfigured()) return null;
  return createBrowserClient(getSupabaseUrl()!, getSupabasePublishableKey()!);
}
