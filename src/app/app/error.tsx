"use client";

import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { routes } from "@/lib/routes";

export default function AppError() {
  return (
    <EmptyState
      title="Something went wrong"
      description="FightScope could not load this page. Try again in a moment."
      action={<ButtonLink href={routes.app}>Back to home</ButtonLink>}
    />
  );
}
