/**
 * Configurable multi-source registry.
 * Adapters may be unavailable — never pretend a fragile scrape is production-ready.
 */

export type SourceTier = 1 | 2 | 3;

export type SourceAdapterStatus = "active" | "partial" | "unavailable" | "planned";

export type SourceDescriptor = {
  id: string;
  name: string;
  tier: SourceTier;
  sourceType: "official" | "specialist" | "editorial" | "catalog";
  /** Relative trust weight for conflict resolution (0–1). */
  weight: number;
  status: SourceAdapterStatus;
  fields: string[];
  retrieval: string;
  caching: string;
  restrictions: string;
  notes?: string;
};

export const SOURCE_REGISTRY: SourceDescriptor[] = [
  {
    id: "espn-ufc",
    name: "ESPN UFC APIs + fight-stat tables",
    tier: 1,
    sourceType: "official",
    weight: 0.95,
    status: "active",
    fields: [
      "record",
      "physicals",
      "rankings",
      "recentFights",
      "finishes",
      "rateStats",
      "boutResults",
    ],
    retrieval: "Documented ESPN public sports APIs + fighter stats page structured payload",
    caching: "Catalog snapshot + disk/Supabase analysis cache; refresh via snapshot jobs",
    restrictions: "Public API use; respect rate limits; no anti-bot bypass",
    notes: "Primary production ingest path today.",
  },
  {
    id: "fightscope-catalog",
    name: "FightScope catalog snapshot",
    tier: 1,
    sourceType: "catalog",
    weight: 1.0,
    status: "active",
    fields: ["fighters", "events", "fights", "outcomes"],
    retrieval: "Local snapshot.json merged with live ESPN when available",
    caching: "File snapshot; lastUpdated on catalog",
    restrictions: "Internal only",
  },
  {
    id: "ufc-official-stats",
    name: "Official UFC statistics",
    tier: 1,
    sourceType: "official",
    weight: 1.0,
    status: "planned",
    fields: ["rateStats", "boutResults", "control"],
    retrieval: "Not integrated — requires permitted access path",
    caching: "n/a",
    restrictions: "Do not scrape against ToS / anti-bot",
    notes: "Preferred if a licensed/allowed feed becomes available.",
  },
  {
    id: "tapology",
    name: "Tapology",
    tier: 2,
    sourceType: "specialist",
    weight: 0.9,
    status: "unavailable",
    fields: ["record", "boutHistory", "context"],
    retrieval: "Not integrated",
    caching: "n/a",
    restrictions: "No production scraper; ToS / reliability unclear for automated use",
  },
  {
    id: "sherdog",
    name: "Sherdog",
    tier: 2,
    sourceType: "specialist",
    weight: 0.85,
    status: "unavailable",
    fields: ["record", "boutHistory"],
    retrieval: "Not integrated",
    caching: "n/a",
    restrictions: "Fragile HTML; not production-ready",
  },
  {
    id: "fightmatrix",
    name: "FightMatrix",
    tier: 2,
    sourceType: "specialist",
    weight: 0.85,
    status: "planned",
    fields: ["rankings", "ratings"],
    retrieval: "Not integrated",
    caching: "n/a",
    restrictions: "Licensing / access TBD",
  },
  {
    id: "espn-mma-editorial",
    name: "ESPN MMA / editorial context",
    tier: 3,
    sourceType: "editorial",
    weight: 0.7,
    status: "partial",
    fields: ["context"],
    retrieval: "Same ESPN ecosystem for event context only",
    caching: "Via catalog event metadata",
    restrictions: "Context only — never invent injuries/camps from headlines",
  },
];

export function activeSources(): SourceDescriptor[] {
  return SOURCE_REGISTRY.filter((s) => s.status === "active" || s.status === "partial");
}

export function resolveConflict(
  field: string,
  candidates: Array<{ source: string; value: string | number | null; weight: number }>,
): { source: string; value: string | number | null } {
  const usable = candidates.filter((c) => c.value != null && c.value !== "");
  if (usable.length === 0) {
    return { source: "none", value: null };
  }
  usable.sort((a, b) => b.weight - a.weight);
  return { source: usable[0]!.source, value: usable[0]!.value };
}
