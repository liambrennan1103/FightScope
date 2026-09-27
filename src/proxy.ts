import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/public-env";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth/session";
import { routes } from "@/lib/routes";

async function resolveUser(request: NextRequest, response: NextResponse) {
  if (isSupabaseBrowserConfigured()) {
    const url = getSupabaseUrl()!;
    const key = getSupabasePublishableKey()!;
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return {
        id: user.id,
        email: user.email ?? "",
        name:
          (user.user_metadata?.display_name as string | undefined) ||
          user.email?.split("@")[0] ||
          "Account",
      };
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const user = await resolveUser(request, response);

  const isApp = pathname === routes.app || pathname.startsWith(`${routes.app}/`);
  const isAuthPage = pathname === routes.signIn || pathname === routes.signUp;
  const isLanding = pathname === routes.landing;

  if (isApp && !user) {
    const url = request.nextUrl.clone();
    url.pathname = routes.signIn;
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL(routes.app, request.url));
  }

  if (user && isLanding) {
    return NextResponse.redirect(new URL(routes.app, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/sign-in", "/sign-up", "/app/:path*"],
};
