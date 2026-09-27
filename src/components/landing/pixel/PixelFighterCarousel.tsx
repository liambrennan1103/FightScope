"use client";

import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import type { Fighter } from "@/lib/types";

const CARD_WIDTH = 168;
const CARD_GAP = 12;
/** Seconds for one full marquee loop (subtle, premium pace). */
const MARQUEE_DURATION_SEC = 110;

export function PixelFighterCarousel({ fighters }: { fighters: Fighter[] }) {
  const items = fighters.length > 0 ? fighters : [];
  const loop = items.length > 0 ? [...items, ...items] : [];

  if (items.length === 0) return null;

  const segmentWidth = items.length * (CARD_WIDTH + CARD_GAP);
  const durationSec = Math.max(MARQUEE_DURATION_SEC, segmentWidth / 14);

  return (
    <div className="pixel-carousel" aria-hidden="true">
      <div className="pixel-carousel-viewport">
        <div
          className="pixel-carousel-track pixel-fighter-marquee-track"
          style={{ ["--pixel-marquee-duration" as string]: `${durationSec}s` }}
        >
          {loop.map((fighter, index) => (
            <div key={`${fighter.id}-${index}`} className="pixel-carousel-card">
              <FighterPortrait
                fighter={fighter}
                name={fighter.name}
                portrait={fighter.portrait}
                variant="hero"
                className="pixel-carousel-portrait !rounded-xl"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
