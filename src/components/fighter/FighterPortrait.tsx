"use client";

import { useState } from "react";
import { AnonymousFighterPortrait, ANONYMOUS_FIGHTER_SRC } from "@/components/fighter/AnonymousFighterPortrait";
import { resolveFighterPresentation } from "@/data/fighter-presentation";
import { cn } from "@/lib/cn";
import type { FighterPortraitConfig } from "@/lib/types";

export type PortraitVariant = "avatar" | "thumb" | "card" | "medium" | "hero" | "featured";

interface FighterPortraitProps {
  name: string;
  portrait?: FighterPortraitConfig | null;
  variant?: PortraitVariant;
  ring?: boolean;
  className?: string;
  fighter?: {
    id?: string;
    slug?: string;
    name?: string;
    portrait?: FighterPortraitConfig | null;
  };
}

const variants: Record<PortraitVariant, string> = {
  avatar: "h-8 w-8 text-[10px] rounded-full",
  thumb: "h-11 w-9 text-[10px] sm:h-12 sm:w-10 rounded-lg",
  card: "h-16 w-16 text-sm sm:h-[4.75rem] sm:w-[4.75rem] rounded-full",
  medium: "h-[5.5rem] w-[4.25rem] text-base sm:h-24 sm:w-[4.75rem] rounded-xl",
  hero: "h-36 w-[6.75rem] text-xl sm:h-44 sm:w-32 lg:h-[14.5rem] lg:w-[10.25rem] rounded-xl",
  featured: "h-[9.5rem] w-[7rem] text-xl sm:h-[12.5rem] sm:w-[9rem] lg:h-[16.5rem] lg:w-[11.5rem] rounded-xl",
};

function isUsablePortraitSrc(src: string | null | undefined): src is string {
  if (!src) return false;
  // Never render remote ESPN guesses or other absolute CDNs as primary —
  // only local FightScope assets (and explicit curated paths).
  if (/^https?:\/\//i.test(src) && !src.includes("/portraits/")) return false;
  if (/espncdn\.com/i.test(src)) return false;
  return true;
}

/**
 * Single reliable fighter-image resolver used across FightScope.
 * Only renders real portraits that resolve to a known local/curated asset.
 * On load failure → clean inline silhouette (never browser broken-image icon).
 */
export function FighterPortrait({
  name,
  portrait,
  fighter,
  variant = "card",
  ring = false,
  className,
}: FighterPortraitProps) {
  const mapped = resolveFighterPresentation({
    id: fighter?.id,
    slug: fighter?.slug,
    name: fighter?.name ?? name,
  });
  const preferred = portrait?.src ? portrait : fighter?.portrait?.src ? fighter.portrait : null;
  const candidate =
    preferred?.src && preferred.status !== "fallback"
      ? preferred
      : mapped.src
        ? mapped
        : preferred?.status === "fallback"
          ? mapped
          : preferred ?? mapped;
  const label = fighter?.name ?? name;
  const rawSrc =
    candidate?.src && candidate.status !== "fallback" ? candidate.src : mapped.src;
  const src = isUsablePortraitSrc(rawSrc) ? rawSrc : null;
  const position = candidate?.objectPosition ?? mapped.objectPosition ?? "50% 14%";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;
  const imageLoaded = Boolean(src) && loadedSrc === src;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-[#161618]",
        ring ? "ring-2 ring-accent/65 ring-offset-2 ring-offset-background" : "ring-1 ring-white/[0.08]",
        variants[variant],
        className,
      )}
      role="img"
      aria-label={label}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src || undefined}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: position }}
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          draggable={false}
        />
      ) : (
        <AnonymousFighterPortrait name={label} />
      )}
      {showImage && !imageLoaded ? (
        <span className="fs-shimmer pointer-events-none absolute inset-0" aria-hidden="true" />
      ) : null}
      {showImage ? (
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,transparent_40%,rgba(11,11,13,0.45)_100%)]"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

export { ANONYMOUS_FIGHTER_SRC };
