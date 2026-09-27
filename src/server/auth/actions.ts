"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/public-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authenticateUser, createUser } from "@/server/auth/users";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/server/auth/session";
import { routes } from "@/lib/routes";

export interface AuthFormState {
  error?: string;
}

function safeNext(value: unknown): string {
  if (typeof value !== "string") return routes.app;
  if (!value.startsWith(routes.app)) return routes.app;
  if (value.startsWith("//")) return routes.app;
  return value;
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function setLegacySession(user: { id: string; email: string; name: string }) {
  const token = await createSessionToken(user);
  const jar = await cookies();
  jar.set({
    ...sessionCookieOptions(),
    value: token,
  });
}

async function clearLegacySession() {
  const jar = await cookies();
  jar.set({
    ...sessionCookieOptions(),
    value: "",
    maxAge: 0,
  });
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!validEmail(email) || password.length < 8) {
    return { error: "Enter a valid email and password (8+ characters)." };
  }

  if (isSupabaseBrowserConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { error: error?.message || "Email or password is incorrect." };
    }
    await setLegacySession({
      id: data.user.id,
      email: data.user.email ?? email,
      name:
        (data.user.user_metadata?.display_name as string | undefined) ||
        email.split("@")[0] ||
        "Fighter",
    });
    redirect(next);
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return { error: "Email or password is incorrect." };
  }

  await setSession(user);
  redirect(next);
}

async function setSession(user: { id: string; email: string; name: string }) {
  await setLegacySession(user);
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!validEmail(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (isSupabaseBrowserConfigured()) {
    const supabase = await createSupabaseServerClient();
    const displayName = email.split("@")[0] || "Fighter";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error || !data.user) {
      return { error: error?.message || "Could not create account." };
    }
    // Ensure profile row exists (trigger may race; RLS insert_own allows this).
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        display_name: displayName,
        plan: "free",
        subscription_status: "none",
      },
      { onConflict: "id" },
    );
    if (!data.session) {
      // Project has "Confirm email" enabled — account exists, no session yet.
      redirect(`${routes.signIn}?registered=1`);
    }
    await setLegacySession({
      id: data.user.id,
      email,
      name: displayName,
    });
    redirect(next);
  }

  try {
    const user = await createUser({ email, password });
    await setSession(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create account.";
    return { error: message };
  }
  redirect(next);
}

export async function signOutAction() {
  if (isSupabaseBrowserConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      /* still clear local cookie */
    }
  }
  await clearLegacySession();
  redirect(routes.landing);
}
