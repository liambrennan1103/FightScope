"use client";

import { cn } from "@/lib/cn";

type GlassTone =
  | "nav"
  | "panel"
  | "capsule"
  | "overlay"
  | "frosted"
  | "data"
  | "deep";

const toneClass: Record<GlassTone, string> = {
  nav: "fs-glass fs-glass-nav",
  panel: "fs-glass fs-glass-panel",
  capsule: "fs-glass fs-glass-capsule",
  overlay: "fs-glass fs-glass-overlay",
  frosted: "fs-glass fs-glass-frosted",
  data: "fs-glass fs-glass-data",
  deep: "fs-glass fs-glass-deep",
};

type GlassPanelProps = {
  tone?: GlassTone;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * Liquid Glass surfaces.
 * - frosted: dense nav/chrome
 * - data: floating analytical cards
 * - deep: premium / conversion only
 * Dense raw tables can stay on opaque `bg-surface`.
 */
export function GlassPanel({
  tone = "panel",
  className,
  children,
  ...rest
}: GlassPanelProps) {
  return (
    <div className={cn(toneClass[tone], className)} {...rest}>
      {children}
    </div>
  );
}
