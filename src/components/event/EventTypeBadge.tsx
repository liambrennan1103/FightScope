import { cn } from "@/lib/cn";
import { resolveEventTheme } from "@/lib/event-identity";
import type { Event } from "@/lib/types";

export function EventTypeBadge({
  event,
  className,
}: {
  event: Event;
  className?: string;
}) {
  const theme = resolveEventTheme(event);
  const completed = event.status === "completed";
  const cancelled = event.status === "cancelled";
  const label = cancelled ? "Cancelled" : completed ? "Final" : theme.label;
  const prestige = theme.prestige;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase",
        completed || cancelled
          ? "border-white/12 text-mute"
          : prestige >= 4
            ? "border-[color-mix(in_srgb,var(--event-accent-2)_55%,transparent)] bg-[color-mix(in_srgb,var(--event-accent-2)_12%,transparent)] text-[var(--event-accent-2)]"
            : prestige <= 1
              ? "border-white/10 text-mute"
              : "border-[color-mix(in_srgb,var(--event-accent)_35%,transparent)] text-[var(--event-accent)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
