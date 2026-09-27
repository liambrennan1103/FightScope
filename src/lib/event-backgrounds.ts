/**
 * Local event atmosphere backgrounds.
 * Files live in /public/events/backgrounds/.
 * Photorealistic assets — replace with licensed city photography when available
 * (see scripts/fetch-event-backgrounds.mjs).
 */
import { classifyEventKind, classifyEventLocation } from "@/lib/event-identity";
import type { Event } from "@/lib/types";

export type EventBackgroundId =
  | "vegas"
  | "paris"
  | "mexico"
  | "abu-dhabi"
  | "shanghai"
  | "new-york"
  | "los-angeles"
  | "philadelphia"
  | "default";

const BG_BASE = "/events/backgrounds";

export function eventBackgroundSrc(id: EventBackgroundId): string {
  return `${BG_BASE}/${id}.png`;
}

function placeText(event: Event): string {
  return `${event.location ?? ""} ${event.venue ?? ""} ${event.name} ${event.slug}`.toLowerCase();
}

/**
 * Map event → local background asset.
 * Noche always gets Mexico atmosphere even when staged in Glendale.
 */
export function resolveEventBackgroundId(event: Event): EventBackgroundId {
  const kind = classifyEventKind(event);
  const location = classifyEventLocation(event);
  const place = placeText(event);

  if (kind === "noche" || location === "mexico") return "mexico";
  if (location === "paris" || /\bparis\b|\bfrance\b|\baccor\b/.test(place)) return "paris";
  if (location === "vegas" || /\blas vegas\b|\bvegas\b|\bt-mobile arena\b/.test(place)) {
    return "vegas";
  }
  if (location === "abu-dhabi" || /\babu dhabi\b|\byas\b/.test(place)) return "abu-dhabi";
  if (location === "shanghai" || /\bshanghai\b|\bchina\b/.test(place)) return "shanghai";
  if (location === "new-york" || /\bnew york\b|\bmadison square\b/.test(place)) return "new-york";
  if (/\bphiladelphia\b/.test(place)) return "philadelphia";
  if (/\blos angeles\b|\bhollywood\b|\bsacramento\b|\boklahoma\b|\bsalt lake\b/.test(place)) {
    return "los-angeles";
  }
  // Contender Series in Vegas already caught; other cities → arena default
  return "default";
}

export function resolveEventBackgroundSrc(event: Event): string {
  return eventBackgroundSrc(resolveEventBackgroundId(event));
}
