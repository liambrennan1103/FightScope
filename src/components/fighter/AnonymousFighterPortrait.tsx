"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export const ANONYMOUS_FIGHTER_SRC = "/portraits/anonymous-fighter.svg";

/**
 * Clean FightScope silhouette — final fallback when no real portrait exists.
 * Inline SVG (not <img>) so a missing/corrupt asset can never show the
 * browser broken-image icon.
 */
export function AnonymousFighterPortrait({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const bg = `fs-anon-bg-${uid}`;
  const bust = `fs-anon-bust-${uid}`;
  const glow = `fs-anon-glow-${uid}`;
  const edge = `fs-anon-edge-${uid}`;

  return (
    <svg
      viewBox="0 0 200 280"
      className={cn("h-full w-full", className)}
      aria-hidden="true"
      focusable="false"
      role="presentation"
      data-fighter-fallback={name}
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1a1d" />
          <stop offset="55%" stopColor="#121214" />
          <stop offset="100%" stopColor="#1c1214" />
        </linearGradient>
        <linearGradient id={bust} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#2a2a2e" />
          <stop offset="45%" stopColor="#1c1c20" />
          <stop offset="100%" stopColor="#141416" />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="28%" r="55%">
          <stop offset="0%" stopColor="#e33b3b" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#e33b3b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={edge} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e33b3b" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#e33b3b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="200" height="280" fill={`url(#${bg})`} />
      <rect width="200" height="280" fill={`url(#${glow})`} />
      <rect x="0" y="0" width="200" height="2" fill={`url(#${edge})`} />
      <path
        d="M18 280 C28 210 58 188 100 188 C142 188 172 210 182 280 Z"
        fill={`url(#${bust})`}
      />
      <path
        d="M34 280 C42 228 64 206 100 206 C136 206 158 228 166 280 Z"
        fill="#17171a"
        opacity="0.55"
      />
      <path
        d="M84 168 C88 184 92 196 100 198 C108 196 112 184 116 168 Z"
        fill="#222226"
      />
      <ellipse cx="100" cy="118" rx="42" ry="50" fill={`url(#${bust})`} />
      <ellipse cx="100" cy="124" rx="28" ry="34" fill="#1a1a1e" opacity="0.55" />
      <ellipse cx="58" cy="122" rx="7" ry="11" fill="#242428" opacity="0.8" />
      <ellipse cx="142" cy="122" rx="7" ry="11" fill="#242428" opacity="0.8" />
      <path
        d="M62 108 C70 78 130 78 138 108 C132 92 68 92 62 108 Z"
        fill="#101012"
        opacity="0.75"
      />
      <rect width="200" height="280" fill={`url(#${glow})`} opacity="0.5" />
    </svg>
  );
}
