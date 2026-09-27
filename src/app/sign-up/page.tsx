import { AuthChrome } from "@/components/layout/AuthChrome";
import { AuthForm } from "@/components/auth/AuthForm";
import { routes } from "@/lib/routes";
import { signUpAction } from "@/server/auth/actions";

export const metadata = { title: "Create account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthChrome>
      <AuthForm
        title="Create account"
        submitLabel="Create account"
        action={signUpAction}
        next={next}
        alternateHref={routes.signIn}
        alternateLabel="Sign in"
        alternatePrompt="Already have an account?"
      />
    </AuthChrome>
  );
}
