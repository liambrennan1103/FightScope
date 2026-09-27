import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { routes } from "@/lib/routes";

export default function AppNotFound() {
  return (
    <EmptyState
      title="Not found"
      description="That fighter, fight, or event is unavailable."
      action={<ButtonLink href={routes.app}>Back to home</ButtonLink>}
    />
  );
}
