import type { Fighter, FighterPortraitConfig } from "@/lib/types";
import portraitIndex from "./portrait-index.json";
import { ESPN_OBJECT_POSITION } from "./portrait-constants";

export type FighterPresentation = {
  espnId?: string;
  name: string;
  aliases: string[];
  portraitSrc?: string;
  objectPosition?: string;
  objectFit?: "cover" | "contain";
  nickname?: string;
};

/**
 * Curated FightScope presentation only (nicknames, crop overrides).
 * Independent of live ESPN factual records.
 * Portraits for the rest of the roster come from the ESPN headshot pipeline.
 */
export const FIGHTER_PRESENTATION: FighterPresentation[] = [
  {
    espnId: "4350812",
    name: "Ilia Topuria",
    aliases: ["ilia-topuria", "topuria"],
    objectPosition: "50% 12%",
    nickname: "El Matador",
  },
  {
    espnId: "3332412",
    name: "Islam Makhachev",
    aliases: ["islam-makhachev", "makhachev"],
    objectPosition: "50% 12%",
    nickname: "The Eagle",
  },
  {
    espnId: "4419372",
    name: "Arman Tsarukyan",
    aliases: ["arman-tsarukyan", "tsarukyan"],
    objectPosition: "50% 12%",
  },
  {
    espnId: "4705658",
    name: "Alex Pereira",
    aliases: ["alex-pereira", "pereira"],
    objectPosition: "50% 10%",
    nickname: "Poatan",
  },
  {
    espnId: "4205093",
    name: "Sean O'Malley",
    aliases: ["sean-omalley", "omalley", "sean-o-malley"],
    objectPosition: "50% 10%",
    nickname: "Suga",
  },
  {
    espnId: "3948572",
    name: "Merab Dvalishvili",
    aliases: ["merab-dvalishvili", "dvalishvili"],
    objectPosition: "50% 12%",
    nickname: "The Machine",
  },
  {
    espnId: "2560746",
    name: "Alexandre Pantoja",
    aliases: ["alexandre-pantoja", "pantoja"],
    objectPosition: "50% 12%",
    nickname: "The Cannibal",
  },
  {
    espnId: "4273399",
    name: "Magomed Ankalaev",
    aliases: ["magomed-ankalaev", "ankalaev"],
    objectPosition: "50% 12%",
  },
  {
    espnId: "4350762",
    name: "Zhang Weili",
    aliases: ["zhang-weili", "weili"],
    objectPosition: "50% 16%",
  },
  {
    espnId: "2554705",
    name: "Valentina Shevchenko",
    aliases: ["valentina-shevchenko", "shevchenko"],
    objectPosition: "50% 12%",
    nickname: "Bullet",
  },
  {
    espnId: "4917772",
    name: "Tatsuro Taira",
    aliases: ["tatsuro-taira", "taira"],
    objectPosition: "50% 12%",
  },
  {
    espnId: "4828707",
    name: "Jack Della Maddalena",
    aliases: ["jack-della-maddalena", "della-maddalena"],
  },
];

const DEFAULT_POSITION = ESPN_OBJECT_POSITION;
const INDEX = portraitIndex as {
  entries: Record<string, { src?: string; status?: string }>;
};

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function lastNameKey(name: string): string {
  const parts = name.trim().split(/\s+/);
  return normalize(parts[parts.length - 1] ?? name);
}

export function findPresentation(input: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
}): FighterPresentation | null {
  const id = input.id?.trim() ?? "";
  const tokens = [input.slug, input.name, input.name ? lastNameKey(input.name) : null]
    .filter((item): item is string => Boolean(item))
    .map(normalize);

  return (
    FIGHTER_PRESENTATION.find((entry) => {
      if (id && entry.espnId === id) return true;
      const entryKeys = [entry.name, ...entry.aliases].map(normalize);
      return tokens.some((token) => entryKeys.includes(token));
    }) ?? null
  );
}

export function resolveFighterPresentation(input: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
}): FighterPortraitConfig {
  const match = findPresentation(input);
  const id = input.id?.trim() ?? "";
  const indexed = id ? INDEX.entries[id] : undefined;

  if (match?.portraitSrc) {
    return {
      src: match.portraitSrc,
      objectPosition: match.objectPosition ?? DEFAULT_POSITION,
      status: "curated",
    };
  }

  if (indexed?.status === "missing" || indexed?.status === "rejected") {
    // Known unresolved — use anonymous avatar immediately (no broken ESPN request).
    return {
      src: null,
      objectPosition: DEFAULT_POSITION,
      status: "fallback",
    };
  }

  if (indexed?.status === "approved" && indexed.src) {
    return {
      src: indexed.src,
      objectPosition: match?.objectPosition ?? DEFAULT_POSITION,
      status: "sourced",
    };
  }

  // Never guess ESPN CDN URLs for unknown IDs — that produces broken <img>
  // boxes with visible alt text. Use the FightScope silhouette instead.
  return {
    src: null,
    objectPosition: DEFAULT_POSITION,
    status: "fallback",
  };
}

export function applyFighterPresentation(fighter: Fighter): Fighter {
  const match = findPresentation(fighter);
  const portrait = resolveFighterPresentation(fighter);
  return {
    ...fighter,
    portrait,
    nickname: fighter.nickname ?? match?.nickname ?? null,
  };
}

/** ESPN athlete IDs that should always be ingested so curated fighters remain searchable. */
export const PRESENTATION_ESPN_IDS: Array<{ espnId: string; name: string }> = FIGHTER_PRESENTATION.filter(
  (entry): entry is FighterPresentation & { espnId: string } => Boolean(entry.espnId),
).map((entry) => ({ espnId: entry.espnId, name: entry.name }));
