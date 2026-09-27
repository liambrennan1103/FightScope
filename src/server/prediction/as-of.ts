import type { Fighter, FightResult, RecentFight, RecordLine, FinishRecord } from "@/lib/types";

function parseDate(value: string | undefined | null): number {
  if (!value) return Number.NaN;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : Number.NaN;
}

function classifyMethod(method: string | null | undefined): "ko" | "sub" | "dec" | "other" {
  if (!method) return "other";
  const m = method.toLowerCase();
  if (/\b(ko|tko|knockout)\b/.test(m) || /punch|kick|elbow|knee|strike|ground.?and.?pound/.test(m)) {
    return "ko";
  }
  if (/\bsub/.test(m) || /choke|armbar|triangle|kimura|guillotine|heel|kneebar|americana|calf|lock/.test(m)) {
    return "sub";
  }
  if (/dec|unanimous|split|majority|points/.test(m)) return "dec";
  return "other";
}

/**
 * Return fighter state as it could have been known strictly before `asOf`.
 * Strips the bout itself from recent history and adjusts record/finishes when
 * the completed fight outcome would otherwise leak into career totals.
 */
export function fighterAsOf(
  fighter: Fighter,
  asOfIso: string,
  opts: {
    /** Outcome of the fight being predicted — used only to undo leakage from career totals. */
    leakOutcome?: {
      winnerId: string | null;
      method: string | null;
      fighterAId: string;
      fighterBId: string;
    };
  } = {},
): Fighter {
  const asOfMs = parseDate(asOfIso);
  const recent = (fighter.recentFights ?? []).filter((rf) => {
    const t = parseDate(rf.date);
    if (!Number.isFinite(asOfMs) || !Number.isFinite(t)) return true;
    return t < asOfMs;
  });

  let finishes: FinishRecord = { ...fighter.finishes };

  // Undo every post-asOf bout visible in recentFights (strict pre-fight totals).
  let record: RecordLine = careerRecordAsOf(fighter, asOfIso);

  const leak = opts.leakOutcome;
  if (leak && Number.isFinite(asOfMs)) {
    const isA = fighter.id === leak.fighterAId;
    const isB = fighter.id === leak.fighterBId;
    if (isA || isB) {
      const won = leak.winnerId != null && leak.winnerId === fighter.id;
      const lost = leak.winnerId != null && leak.winnerId !== fighter.id;
      const draw = leak.winnerId == null;

      // If the predicted bout is absent from recentFights, careerRecordAsOf could
      // not undo it — apply a one-fight record correction to avoid leakage.
      const boutVisibleInRecent = (fighter.recentFights ?? []).some((rf) => {
        const t = parseDate(rf.date);
        return Number.isFinite(t) && t >= asOfMs;
      });
      if (!boutVisibleInRecent) {
        if (won) record = { ...record, wins: Math.max(0, record.wins - 1) };
        else if (lost) record = { ...record, losses: Math.max(0, record.losses - 1) };
        else if (draw) record = { ...record, draws: Math.max(0, record.draws - 1) };
      }

      // Finish totals are career aggregates; always undo this bout's finish type.
      if (won) {
        const kind = classifyMethod(leak.method);
        if (kind === "ko" && finishes.koTko != null) {
          finishes = { ...finishes, koTko: Math.max(0, finishes.koTko - 1) };
        }
        if (kind === "sub" && finishes.submissions != null) {
          finishes = { ...finishes, submissions: Math.max(0, finishes.submissions - 1) };
        }
      } else if (lost) {
        const kind = classifyMethod(leak.method);
        if (kind === "ko" && finishes.koTkoLosses != null) {
          finishes = { ...finishes, koTkoLosses: Math.max(0, finishes.koTkoLosses - 1) };
        }
        if (kind === "sub" && finishes.submissionLosses != null) {
          finishes = {
            ...finishes,
            submissionLosses: Math.max(0, finishes.submissionLosses - 1),
          };
        }
      }
    }
  }

  // Age: approximate days younger if asOf is in the past relative to "now" snapshot.
  // Without DOB we cannot perfectly reconstruct — leave age but flag via coverage.
  const age = fighter.age;

  return {
    ...fighter,
    record,
    finishes,
    age,
    recentFights: recent,
    // Rate stats are career aggregates that may include the fight — down-weighted in features when asOf set.
  };
}

/**
 * Reconstruct career record using only fights strictly before `asOf`.
 * Undoes every recentFight with date >= asOf from the snapshot career totals.
 *
 * Limitation: only fights present in `recentFights` can be undone; older bouts
 * not listed there remain in the totals (unavoidable without full fight history).
 */
export function careerRecordAsOf(fighter: Fighter, asOfIso: string): RecordLine {
  const asOfMs = parseDate(asOfIso);
  let wins = fighter.record.wins;
  let losses = fighter.record.losses;
  let draws = fighter.record.draws;
  let noContests = fighter.record.noContests ?? 0;

  if (!Number.isFinite(asOfMs)) {
    return { wins, losses, draws, noContests };
  }

  for (const rf of fighter.recentFights ?? []) {
    const t = parseDate(rf.date);
    if (!Number.isFinite(t) || t < asOfMs) continue;
    if (rf.result === "W") wins = Math.max(0, wins - 1);
    else if (rf.result === "L") losses = Math.max(0, losses - 1);
    else if (rf.result === "D") draws = Math.max(0, draws - 1);
    else if (rf.result === "NC") noContests = Math.max(0, noContests - 1);
  }

  return { wins, losses, draws, noContests };
}

/**
 * Pre-fight bout count for sample-size diagnostics (as-of).
 */
export function boutsAsOf(fighter: Fighter, asOfIso: string): number {
  const r = careerRecordAsOf(fighter, asOfIso);
  return r.wins + r.losses + r.draws;
}

export function formFromRecent(
  recent: RecentFight[],
  n: number,
  opts: { decayLambda?: number; nowMs?: number } = {},
): { wins: number; fights: number; winRate: number } {
  const slice = recent.slice(0, n);
  const fights = slice.length;
  if (fights === 0) return { wins: 0, fights: 0, winRate: 0.5 };

  const lambda = opts.decayLambda ?? 0;
  if (lambda <= 0 || !opts.nowMs) {
    const wins = slice.filter((r) => r.result === ("W" as FightResult)).length;
    return { wins, fights, winRate: wins / fights };
  }

  let wSum = 0;
  let ySum = 0;
  for (const rf of slice) {
    const t = parseDate(rf.date);
    const ageDays = Number.isFinite(t) ? Math.max(0, (opts.nowMs - t) / 86_400_000) : 365;
    const w = Math.exp(-lambda * (ageDays / 365));
    wSum += w;
    if (rf.result === ("W" as FightResult)) ySum += w;
  }
  return {
    wins: slice.filter((r) => r.result === ("W" as FightResult)).length,
    fights,
    winRate: wSum > 0 ? ySum / wSum : 0.5,
  };
}

export { classifyMethod, parseDate };

