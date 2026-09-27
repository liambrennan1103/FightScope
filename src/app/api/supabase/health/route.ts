import { NextResponse } from "next/server";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/public-env";
import { tryCreateSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/supabase/client";

export const runtime = "nodejs";

/** Lightweight connectivity check — no secrets returned. */
export async function GET() {
  const browserConfigured = isSupabaseBrowserConfigured();
  const adminConfigured = isSupabaseConfigured();

  if (!browserConfigured) {
    return NextResponse.json(
      {
        ok: false,
        browserConfigured: false,
        adminConfigured,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      },
      { status: 503 },
    );
  }

  try {
    const supabase = await tryCreateSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Could not create client." }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: profileError } = await supabase.from("profiles").select("id").limit(1);

    return NextResponse.json({
      ok: true,
      browserConfigured: true,
      adminConfigured,
      signedIn: Boolean(user),
      userId: user?.id ?? null,
      profilesTable: profileError
        ? { reachable: false, message: profileError.message, code: profileError.code }
        : { reachable: true },
      hint:
        adminConfigured
          ? null
          : "SUPABASE_SECRET_KEY is missing or equals the publishable key — set the real service-role/secret key for admin/cache jobs.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Supabase health check failed",
      },
      { status: 500 },
    );
  }
}
