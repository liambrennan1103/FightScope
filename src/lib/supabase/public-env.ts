/** Public Supabase env — safe to import from client components. */

export function getSupabaseUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return value || undefined;
}

/** Browser-safe publishable / anon key — never a service-role secret. */
export function getSupabasePublishableKey(): string | undefined {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return value || undefined;
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}
