"use client";

import { FightScopeCursor } from "@/components/ui/FightScopeCursor";

/** Mounts the red FightScope cursor for pointer-capable devices only. */
export function GlobalCursor() {
  return <FightScopeCursor />;
}
