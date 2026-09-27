/**
 * @deprecated Use `@/server/analysis/engine` (`analyzeFight` / `analyzeFightSync`).
 * Server-only — do not import from client components.
 */
import "server-only";

import { analyzeFightSync } from "@/server/analysis/engine";
import type { Fighter, Prediction } from "@/lib/types";

export function mockHypotheticalPrediction(fighterA: Fighter, fighterB: Fighter): Prediction {
  return analyzeFightSync(fighterA, fighterB);
}
