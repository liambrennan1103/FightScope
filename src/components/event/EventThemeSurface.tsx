import { cn } from "@/lib/cn";
import { EventMotif } from "@/components/event/EventMotif";
import { resolveEventBackgroundSrc } from "@/lib/event-backgrounds";
import { resolveEventTheme, type EventThemeIntensity } from "@/lib/event-identity";
import type { Event } from "@/lib/types";

/**
 * Themed event surface with real location atmosphere photo + overlay.
 * Layout classes apply to the content layer so decorative layers
 * never pull fighters / VS / title off-center.
 */
export function EventThemeSurface({
  event,
  intensity,
  className,
  children,
}: {
  event: Event;
  intensity?: EventThemeIntensity;
  className?: string;
  children: React.ReactNode;
}) {
  const theme = resolveEventTheme(event);
  const resolvedIntensity = intensity ?? theme.intensity;
  const backgroundSrc = resolveEventBackgroundSrc(event);

  return (
    <div
      className="fs-event relative rounded-xl border border-white/[0.08]"
      data-kind={theme.kind}
      data-location={theme.location ?? "none"}
      data-pattern={theme.pattern}
      data-motif={theme.motif}
      data-prestige={theme.prestige}
      data-intensity={resolvedIntensity}
      data-has-photo="true"
      style={
        {
          "--event-accent": theme.accent,
          "--event-accent-2": theme.accentSecondary,
          "--event-photo": `url(${backgroundSrc})`,
        } as React.CSSProperties
      }
    >
      <div className="fs-event-photo" aria-hidden="true" />
      <div className="fs-event-photo-overlay" aria-hidden="true" />
      <div className="fs-event-art" aria-hidden="true">
        <EventMotif motif={theme.motif} />
      </div>
      <div className={cn("fs-event-content relative z-[2]", className)}>{children}</div>
    </div>
  );
}
