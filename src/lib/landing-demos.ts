import { findPresentation, resolveFighterPresentation } from "@/data/fighter-presentation";
import portraitIndex from "@/data/portrait-index.json";
import type { Fighter, FightView } from "@/lib/types";

const PORTRAIT_INDEX = portraitIndex as {
  entries: Record<string, { src?: string; status?: string }>;
};

/** True when FightScope has a verified local portrait asset (no guessed ESPN paths). */
export function hasLandingPortrait(fighter: Fighter): boolean {
  const curated = findPresentation(fighter);
  if (curated?.portraitSrc) return true;

  const indexed = PORTRAIT_INDEX.entries[fighter.id];
  if (indexed?.status === "approved" && indexed.src) return true;

  const resolved = resolveFighterPresentation(fighter);
  return resolved.status === "curated" && Boolean(resolved.src);
}

export function isNamedLandingFighter(fighter: Fighter): boolean {
  const name = fighter.name.trim().toLowerCase();
  if (name.length < 3) return false;
  if (name === "tba" || name === "opponent tba") return false;
  if (/\btba\b/.test(name)) return false;
  return true;
}

export function isLandingDemoFight(view: FightView): boolean {
  return (
    isNamedLandingFighter(view.fighterA) &&
    isNamedLandingFighter(view.fighterB) &&
    hasLandingPortrait(view.fighterA) &&
    hasLandingPortrait(view.fighterB)
  );
}

/** Prefer main-card / later boutOrder fights with clean portraits. */
export function pickLandingDemoFights(
  views: FightView[],
  count: number,
): FightView[] {
  const eligible = views
    .filter(isLandingDemoFight)
    .slice()
    .sort(
      (a, b) =>
        b.fight.boutOrder - a.fight.boutOrder ||
        a.event.date.localeCompare(b.event.date),
    );

  const picked: FightView[] = [];
  const usedFighterIds = new Set<string>();
  const usedFightIds = new Set<string>();

  for (const view of eligible) {
    if (picked.length >= count) break;
    if (usedFightIds.has(view.fight.id)) continue;
    if (usedFighterIds.has(view.fighterA.id) || usedFighterIds.has(view.fighterB.id)) continue;
    picked.push(view);
    usedFightIds.add(view.fight.id);
    usedFighterIds.add(view.fighterA.id);
    usedFighterIds.add(view.fighterB.id);
  }

  // Fill remaining without fighter uniqueness if needed.
  for (const view of eligible) {
    if (picked.length >= count) break;
    if (usedFightIds.has(view.fight.id)) continue;
    picked.push(view);
    usedFightIds.add(view.fight.id);
  }

  return picked;
}

export function findFighterByName(fighters: Fighter[], needle: string): Fighter | undefined {
  const q = needle.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return fighters.find((fighter) => {
    const name = fighter.name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    const last = fighter.lastName.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    return name.includes(q) || last === q || `${fighter.firstName} ${fighter.lastName}`.toLowerCase().includes(q);
  });
}

/** Count non-null analysis inputs for a fighter (physicals, rates, attributes, form). */
export function countFighterDataPoints(fighter: Fighter): number {
  let n = 0;
  const physicals: Array<number | string | null | undefined> = [
    fighter.age,
    fighter.heightCm,
    fighter.reachCm,
    fighter.stance,
  ];
  for (const value of physicals) {
    if (value != null && value !== "") n += 1;
  }
  for (const value of Object.values(fighter.statistics)) {
    if (value != null && Number.isFinite(value)) n += 1;
  }
  for (const value of Object.values(fighter.attributes)) {
    if (value != null && Number.isFinite(value) && value > 0) n += 1;
  }
  const finishes = Object.values(fighter.finishes);
  for (const value of finishes) {
    if (value != null && Number.isFinite(value)) n += 1;
  }
  n += Math.min(fighter.recentFights.length, 5);
  if (fighter.statSplits) {
    for (const value of Object.values(fighter.statSplits)) {
      if (value != null && Number.isFinite(value)) n += 1;
    }
  }
  return n;
}

export function countMatchupDataPoints(fighterA: Fighter, fighterB: Fighter): number {
  return countFighterDataPoints(fighterA) + countFighterDataPoints(fighterB);
}
