import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="That FightScope page does not exist."
      action={<ButtonLink href={routes.landing}>Back to FightScope</ButtonLink>}
    />
  );
}
