import { AuthChrome } from "@/components/layout/AuthChrome";
import { AuthForm } from "@/components/auth/AuthForm";
import { routes } from "@/lib/routes";
import { signInAction } from "@/server/auth/actions";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const { next, registered } = await searchParams;
  return (
    <AuthChrome>
      {registered ? (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-ink">
          Account created. If your project requires email confirmation, check your inbox, then sign
          in.
        </p>
      ) : null}
      <AuthForm
        title="Sign in"
        submitLabel="Sign in"
        action={signInAction}
        next={next}
        alternateHref={routes.signUp}
        alternateLabel="Create account"
        alternatePrompt="New to FightScope?"
      />
    </AuthChrome>
  );
}
