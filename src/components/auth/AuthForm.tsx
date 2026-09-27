"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { routes } from "@/lib/routes";
import type { AuthFormState } from "@/server/auth/actions";

interface AuthFormProps {
  title: string;
  submitLabel: string;
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  next?: string;
  alternateHref: string;
  alternateLabel: string;
  alternatePrompt: string;
}

export function AuthForm({
  title,
  submitLabel,
  action,
  next,
  alternateHref,
  alternateLabel,
  alternatePrompt,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next || routes.app} />
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
            Email
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="box-border h-11 w-full min-w-0 rounded-lg border border-white/10 bg-elevated px-3 text-sm text-ink outline-none focus:border-accent/50"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
            Password
          </span>
          <input
            type="password"
            name="password"
            autoComplete={submitLabel === "Sign in" ? "current-password" : "new-password"}
            required
            minLength={8}
            className="box-border h-11 w-full min-w-0 rounded-lg border border-white/10 bg-elevated px-3 text-sm text-ink outline-none focus:border-accent/50"
          />
        </label>
        {state.error ? (
          <p className="text-sm text-accent" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" className="w-full shrink-0" disabled={pending}>
          {pending ? "Please wait…" : submitLabel}
        </Button>
      </form>
      <p className="mt-5 text-sm text-mute">
        {alternatePrompt}{" "}
        <Link href={alternateHref} className="text-ink hover:text-accent">
          {alternateLabel}
        </Link>
      </p>
    </div>
  );
}
