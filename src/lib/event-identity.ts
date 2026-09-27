import type { Event, EventStatus, FightView, Fighter } from "@/lib/types";

/**
 * FightScope Event Identity
 *
 * Presentation-only. Never mutates factual ESPN/catalog data.
 *
 * Resolution order (first match wins the *kind*; location then *enhances*):
 *   1. Special event  — Noche UFC
 *   2. Event type     — numbered PPV, Fight Night, Contender Series
 *   3. Location       — Mexico, Paris, Las Vegas, Abu Dhabi, Shanghai, New York
 *   4. FightScope default dark/red
 *
 * Noche keeps its own pattern/accent even when staged elsewhere.
 * Location tints secondary accent + overlay + optional motif; it never replaces kind.
 *
 * Prestige hierarchy (same layout language, different weight):
 *   PPV > Fight Night ≈ Noche (special) > Contender Series > other
 */

export type EventKind = "ppv" | "fight-night" | "noche" | "contender" | "other";

export type EventLocationTone =
  | "mexico"
  | "paris"
  | "vegas"
  | "abu-dhabi"
  | "shanghai"
  | "new-york"
  | null;

export type EventThemeIntensity = "subtle" | "standard" | "featured";

export type EventPattern = "none" | "diagonal" | "geo" | "grid" | "arena" | "silk" | "neon";

export type EventMotifId = "none" | "eiffel" | "sombrero" | "vegas" | "luxury" | "shanghai" | "metro";

export type HeadlinerConfidence = "confirmed" | "probable" | "unknown";

export interface EventTheme {
  id: string;
  kind: EventKind;
  location: EventLocationTone;
  label: string;
  accent: string;
  accentSecondary: string;
  pattern: EventPattern;
  intensity: EventThemeIntensity;
  motif: EventMotifId;
  prestige: 1 | 2 | 3 | 4;
}

export interface EventHeadliner {
  view: FightView | null;
  confidence: HeadlinerConfidence;
  knownA: Fighter | null;
  knownB: Fighter | null;
}

interface KindRecipe {
  label: string;
  accent: string;
  accentSecondary: string;
  pattern: EventPattern;
  intensity: EventThemeIntensity;
  prestige: 1 | 2 | 3 | 4;
  motif?: EventMotifId;
}

interface LocationRecipe {
  accentSecondary: string;
  pattern: EventPattern;
  motif: EventMotifId;
}

const KIND_RECIPES: Record<EventKind, KindRecipe> = {
  ppv: {
    label: "PPV",
    accent: "#e33b3b",
    accentSecondary: "#c9a227",
    pattern: "arena",
    intensity: "featured",
    prestige: 4,
  },
  "fight-night": {
    label: "Fight Night",
    accent: "#e33b3b",
    accentSecondary: "#b4232c",
    pattern: "diagonal",
    intensity: "standard",
    prestige: 3,
  },
  noche: {
    label: "Noche",
    accent: "#e24a32",
    accentSecondary: "#d4a017",
    pattern: "geo",
    intensity: "featured",
    prestige: 3,
    motif: "sombrero",
  },
  contender: {
    label: "Contender Series",
    accent: "#c45c4a",
    accentSecondary: "#6b6b73",
    pattern: "grid",
    intensity: "subtle",
    prestige: 1,
  },
  other: {
    label: "UFC",
    accent: "#e33b3b",
    accentSecondary: "#8f242b",
    pattern: "none",
    intensity: "subtle",
    prestige: 2,
  },
};

const LOCATION_RECIPES: Record<Exclude<EventLocationTone, null>, LocationRecipe> = {
  mexico: { accentSecondary: "#e8a317", pattern: "geo", motif: "sombrero" },
  paris: { accentSecondary: "#7a8ca3", pattern: "silk", motif: "eiffel" },
  vegas: { accentSecondary: "#d4b84a", pattern: "neon", motif: "vegas" },
  "abu-dhabi": { accentSecondary: "#c4a35a", pattern: "arena", motif: "luxury" },
  shanghai: { accentSecondary: "#c45c5c", pattern: "silk", motif: "shanghai" },
  "new-york": { accentSecondary: "#8a94a6", pattern: "grid", motif: "metro" },
};

function haystack(event: Event): string {
  return `${event.name} ${event.slug} ${event.subtitle ?? ""} ${event.promotion ?? ""}`.toLowerCase();
}

function placeHaystack(event: Event): string {
  return `${event.location ?? ""} ${event.venue ?? ""} ${event.name}`.toLowerCase();
}

export function classifyEventKind(event: Event): EventKind {
  const text = haystack(event);
  if (/\bnoche\b/.test(text)) return "noche";
  if (/\bcontender\b|\bdwcs\b/.test(text)) return "contender";
  if (/\bfight\s*night\b/.test(text)) return "fight-night";
  if (/\bufc\s*#?\s*\d{2,3}\b/.test(text) || /\bufc-\d{2,3}\b/.test(event.slug.toLowerCase())) {
    return "ppv";
  }
  return "other";
}

export function classifyEventLocation(event: Event): EventLocationTone {
  const text = placeHaystack(event);
  if (/\bmexico\b|\bciudad de m[eé]xico\b|\bmonterrey\b|\bguadalajara\b|\btijuana\b/.test(text)) {
    return "mexico";
  }
  if (/\bparis\b|\bfrance\b/.test(text)) return "paris";
  if (/\blas vegas\b|\bvegas\b/.test(text)) return "vegas";
  if (/\babu dhabi\b|\byas island\b|\betihad\b/.test(text)) return "abu-dhabi";
  if (/\bshanghai\b|\bchina\b|\bbeijing\b|\bmacau\b/.test(text)) return "shanghai";
  if (/\bnew york\b|\bmadison square\b|\bmsg\b|\bbrooklyn\b/.test(text)) return "new-york";
  return null;
}

export function resolveEventTheme(event: Event): EventTheme {
  const kind = classifyEventKind(event);
  const location = classifyEventLocation(event);
  const base = KIND_RECIPES[kind];
  const place = location ? LOCATION_RECIPES[location] : null;

  let accentSecondary = base.accentSecondary;
  let pattern = base.pattern;
  let motif: EventMotifId = base.motif ?? "none";

  // Location enhances type. It never replaces a special-event identity.
  if (place && kind !== "noche") {
    accentSecondary = place.accentSecondary;
    if (
      base.pattern === "none" ||
      base.pattern === "diagonal" ||
      kind === "fight-night" ||
      kind === "other"
    ) {
      pattern = place.pattern;
    } else if (kind === "ppv" && (location === "vegas" || location === "abu-dhabi" || location === "shanghai")) {
      pattern = place.pattern === "neon" || place.pattern === "silk" ? place.pattern : "arena";
    }
    motif = place.motif;
  } else if (place && kind === "noche") {
    accentSecondary = place.accentSecondary;
    motif = "sombrero";
  }

  // Glendale Noche still reads as the special event even without Mexico in the address.
  if (kind === "noche") {
    motif = "sombrero";
    pattern = "geo";
  }

  return {
    id: `${kind}${location ? `:${location}` : ""}`,
    kind,
    location,
    label: base.label,
    accent: base.accent,
    accentSecondary,
    pattern,
    intensity: base.intensity,
    motif,
    prestige: base.prestige,
  };
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameMatches(fighter: Fighter, token: string): boolean {
  const needle = normalizeName(token);
  if (!needle) return false;
  const pool = [fighter.lastName, fighter.name, `${fighter.firstName} ${fighter.lastName}`].map(normalizeName);
  return pool.some((item) => item.includes(needle) || needle.includes(item));
}

function titleMatchup(event: Event): { a: string; b: string } | null {
  const match = event.name.match(/:\s*(.+?)\s+vs\.?\s+(.+)$/i);
  if (!match) return null;
  return {
    a: match[1].trim(),
    b: match[2].replace(/\s+\d+$/, "").trim(),
  };
}

function taggedMain(fights: FightView[]): FightView | null {
  return fights.find((view) => view.fight.cardSegment === "main-event") ?? null;
}

/**
 * Conservative headliner selection.
 * ESPN tags the last listed bout as main-event. That is reliable on a posted card,
 * but not on a thin/partial numbered event (e.g. "UFC 332" with a handful of early bouts).
 * Title "Name vs Name" is the strongest signal. We never invent a headliner.
 */
export function resolveEventHeadliner(event: Event, fights: FightView[]): EventHeadliner {
  if (fights.length === 0) {
    return { view: null, confidence: "unknown", knownA: null, knownB: null };
  }

  const named = titleMatchup(event);
  if (named) {
    const matched = fights.find(
      (view) =>
        (nameMatches(view.fighterA, named.a) && nameMatches(view.fighterB, named.b)) ||
        (nameMatches(view.fighterA, named.b) && nameMatches(view.fighterB, named.a)),
    );
    if (matched) {
      return {
        view: matched,
        confidence: "confirmed",
        knownA: matched.fighterA,
        knownB: matched.fighterB,
      };
    }
  }

  const main = taggedMain(fights);
  const kind = classifyEventKind(event);
  const fullCard = fights.length >= 8;
  const titleFight = Boolean(main?.fight.isTitle);
  const fiveRoundOnPostedCard = Boolean(main && main.fight.rounds === 5 && fights.length >= 5);

  if (main && (fullCard || titleFight || fiveRoundOnPostedCard || kind === "contender" || kind === "fight-night")) {
    if (kind === "ppv" && !named && fights.length < 11 && !titleFight) {
      return { view: null, confidence: "unknown", knownA: null, knownB: null };
    }
    return {
      view: main,
      confidence: named ? "confirmed" : "probable",
      knownA: main.fighterA,
      knownB: main.fighterB,
    };
  }

  if (main && kind !== "ppv") {
    return {
      view: main,
      confidence: "probable",
      knownA: main.fighterA,
      knownB: main.fighterB,
    };
  }

  return { view: null, confidence: "unknown", knownA: null, knownB: null };
}

export function coverageLabel(count: number, status: EventStatus): string {
  if (count === 0) return "Card not posted";
  if (status === "completed") return count === 1 ? "1 result" : `${count} results`;
  return count === 1 ? "1 FightScope prediction" : `${count} FightScope predictions`;
}

export function pickNextEvent(events: Event[]): Event | null {
  const upcoming = events
    .filter((event) => event.status === "upcoming")
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length === 0) return null;
  return upcoming.find((event) => classifyEventKind(event) !== "contender") ?? upcoming[0];
}

export function groupEventCard(fights: FightView[], headliner: FightView | null) {
  const rest = fights.filter((view) => view.fight.id !== headliner?.fight.id);
  const mainCard = rest.filter(
    (view) => view.fight.cardSegment === "main-card" || view.fight.cardSegment === "main-event",
  );
  const prelims = rest.filter((view) => view.fight.cardSegment === "prelims");
  const unsectioned = mainCard.length === 0 && prelims.length === 0;
  return {
    headliner,
    mainCard,
    prelims,
    rest,
    showSections: !unsectioned && (mainCard.length > 0 || prelims.length > 0),
  };
}

export function formatEventPlace(event: Event): string {
  const city = event.location?.trim();
  const venue = event.venue?.trim();
  if (city && venue && venue.toLowerCase() !== city.toLowerCase()) return `${venue} · ${city}`;
  return city || venue || "Location TBA";
}

export function formatEventCity(event: Event): string {
  const city = event.location?.split(",")[0]?.trim();
  return city ? city.toUpperCase() : "LOCATION TBA";
}
