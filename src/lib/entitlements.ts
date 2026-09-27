import type { PlanId } from "@/lib/types";

export function canGenerateAnalysis(plan: PlanId): boolean {
  return plan === "starter" || plan === "pro";
}

export function canAccessProAnalysis(plan: PlanId): boolean {
  return plan === "pro";
}

export function planLabel(plan: PlanId): string {
  switch (plan) {
    case "pro":
      return "Pro";
    case "starter":
      return "Starter";
    default:
      return "Free";
  }
}
