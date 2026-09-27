import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/public-env";

/**
 * Server Supabase client bound to the request cookie store.
 * Uses the publishable key — RLS applies as the signed-in user.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl()!, getSupabasePublishableKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Called from a Server Component — proxy refreshes cookies. */
        }
      },
    },
  });
}

export async function tryCreateSupabaseServerClient() {
  if (!isSupabaseBrowserConfigured()) return null;
  return createSupabaseServerClient();
}
