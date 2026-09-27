/**
 * Elo ratings for MMA fighters — chronological, pre-fight only.
 * K-factor scaled by fight sample; no future leakage.
 */

export type EloTable = Map<string, number>;

export const ELO_DEFAULT = 1500;
export const ELO_K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function eloLogit(ratingA: number, ratingB: number): number {
  // Map Elo gap to a logit-ish scale (~±400 Elo → ±1.0)
  return (ratingA - ratingB) / 400;
}

/**
 * Update ratings after a completed fight.
 * scoreA: 1 win, 0 loss, 0.5 draw.
 */
export function updateElo(
  table: EloTable,
  fighterAId: string,
  fighterBId: string,
  scoreA: number,
  k = ELO_K,
): void {
  const ra = table.get(fighterAId) ?? ELO_DEFAULT;
  const rb = table.get(fighterBId) ?? ELO_DEFAULT;
  const ea = expectedScore(ra, rb);
  const eb = 1 - ea;
  table.set(fighterAId, ra + k * (scoreA - ea));
  table.set(fighterBId, rb + k * (1 - scoreA - eb));
}

export function getElo(table: EloTable, fighterId: string): number {
  return table.get(fighterId) ?? ELO_DEFAULT;
}

/**
 * Build Elo ratings walking fights in chronological order.
 * Returns a snapshot function: ratings BEFORE each fight date.
 */
export function buildEloHistory(
  fights: Array<{
    date: string;
    fighterAId: string;
    fighterBId: string;
    winnerId: string | null;
  }>,
): {
  /** Ratings as of immediately before `date` (ISO). */
  ratingsBefore(date: string): EloTable;
  /** Final ratings after all fights. */
  final: EloTable;
} {
  const sorted = [...fights].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const snapshots: Array<{ dateMs: number; table: EloTable }> = [];
  const live: EloTable = new Map();

  for (const fight of sorted) {
    const dateMs = Date.parse(fight.date);
    // Snapshot clone before applying this fight
    snapshots.push({ dateMs, table: new Map(live) });
    const scoreA =
      fight.winnerId == null
        ? 0.5
        : fight.winnerId === fight.fighterAId
          ? 1
          : fight.winnerId === fight.fighterBId
            ? 0
            : 0.5;
    updateElo(live, fight.fighterAId, fight.fighterBId, scoreA);
  }

  return {
    ratingsBefore(date: string): EloTable {
      const ms = Date.parse(date);
      // Last snapshot with dateMs <= ms, else empty/default
      let best: EloTable = new Map();
      for (const snap of snapshots) {
        if (snap.dateMs <= ms) best = snap.table;
        else break;
      }
      // If asking for a date before first fight, return empty (defaults apply)
      if (!Number.isFinite(ms)) return new Map(live);
      // Find snapshot strictly before this fight's date
      let before: EloTable = new Map();
      for (const snap of snapshots) {
        if (snap.dateMs < ms) before = snap.table;
        else break;
      }
      return before;
    },
    final: live,
  };
}
