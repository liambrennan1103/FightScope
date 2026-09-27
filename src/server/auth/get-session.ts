import { cookies } from "next/headers";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/public-env";
import { tryCreateSupabaseServerClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "./session";

export async function getSession(): Promise<SessionUser | null> {
  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = await tryCreateSupabaseServerClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          return {
            id: user.id,
            email: user.email,
            name:
              (user.user_metadata?.display_name as string | undefined) ||
              user.email.split("@")[0] ||
              "Account",
          };
        }
      }
    } catch {
      /* fall through to legacy cookie */
    }
  }

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
