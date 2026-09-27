import type { FightResult } from "@/lib/types";
import {
  EMPTY_SPLITS,
  EMPTY_STATISTICS,
  type FightStatLog,
  type FighterStatBundle,
  type FighterStatSplits,
  parseClockToMinutes,
  parseNumber,
  parsePair,
  parsePercent,
  ratePer15,
  ratePerMin,
  round1,
  round2,
} from "@/server/analysis/stat-types";

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractEspnfitt(html: string): Json | null {
  const match = html.match(/window\['__espnfitt__'\]\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as Json;
  } catch {
    return null;
  }
}

function competitionIdFromKey(key: string): string {
  const match = key.match(/~c:([^~]+)/);
  return match?.[1] ?? key;
}

function eventIdFromKey(key: string): string | null {
  const match = key.match(/~e:([^~]+)/);
  return match?.[1] ?? null;
}

function parseResult(value: unknown): FightResult | null {
  const text = str(value)?.toUpperCase();
  if (text === "W" || text === "L" || text === "D" || text === "NC") return text;
  return null;
}

function rowMeta(row: unknown[]): {
  date: string;
  opponentName: string | null;
  opponentId: string | null;
  result: FightResult | null;
} {
  let date = "";
  let opponentName: string | null = null;
  let opponentId: string | null = null;
  let result: FightResult | null = null;
  for (const cell of row) {
    if (!isRecord(cell)) continue;
    if (cell.component === "Date") date = str(cell.dte) ?? date;
    if (cell.component === "Opponent") {
      opponentName = str(cell.txt);
      const uid = str(cell.uid);
      const idMatch = uid?.match(/a:(\d+)/);
      opponentId = idMatch?.[1] ?? null;
    }
    if (cell.component === "Fight") result = parseResult(cell.rslt);
  }
  return { date, opponentName, opponentId, result };
}

function tableByTitle(tables: unknown[], title: string): Json | null {
  for (const table of tables) {
    if (isRecord(table) && String(table.ttl).toLowerCase() === title.toLowerCase()) return table;
  }
  return null;
}

function valuesAfterMeta(row: unknown[]): unknown[] {
  // First four cells are Date/Opponent/Event/Fight components.
  return row.slice(4);
}

/**
 * Fetch ESPN fighter stats HTML and parse per-fight striking/clinch/ground logs.
 */
export async function fetchFighterStatLogs(fighterId: string): Promise<FightStatLog[]> {
  const url = `https://www.espn.com/mma/fighter/stats/_/id/${encodeURIComponent(fighterId)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "FightScope/1.0 (MMA analytics)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return [];
  const html = await response.text();
  return parseFighterStatLogsFromHtml(html, fighterId);
}

export function parseFighterStatLogsFromHtml(html: string, fighterId: string): FightStatLog[] {
  const root = extractEspnfitt(html);
  if (!root) return [];
  const player = (root as Json).page;
  if (!isRecord(player)) return [];
  const content = isRecord(player.content) ? player.content : null;
  const playerNode = content && isRecord(content.player) ? content.player : null;
  if (!playerNode) return [];

  const stat = isRecord(playerNode.stat) ? playerNode.stat : null;
  const tables = stat && Array.isArray(stat.tbl) ? stat.tbl : [];
  const striking = tableByTitle(tables, "striking");
  const clinch = tableByTitle(tables, "Clinch");
  const ground = tableByTitle(tables, "Ground");
  if (!striking || !Array.isArray(striking.row)) return [];

  const eventsMap =
    isRecord(playerNode.prtlCmnApiRsp) && isRecord(playerNode.prtlCmnApiRsp.eventsMap)
      ? playerNode.prtlCmnApiRsp.eventsMap
      : {};

  const eventByDateOpponent = new Map<string, { key: string; event: Json }>();
  for (const [key, event] of Object.entries(eventsMap)) {
    if (!isRecord(event)) continue;
    const date = str(event.gameDate) ?? "";
    const opponent = isRecord(event.opponent) ? str(event.opponent.displayName) ?? "" : "";
    eventByDateOpponent.set(`${date}|${opponent}`, { key, event });
  }

  const clinchRows = clinch && Array.isArray(clinch.row) ? clinch.row : [];
  const groundRows = ground && Array.isArray(ground.row) ? ground.row : [];
  const logs: FightStatLog[] = [];

  striking.row.forEach((rawRow, index) => {
    if (!Array.isArray(rawRow)) return;
    const meta = rowMeta(rawRow);
    const sVals = valuesAfterMeta(rawRow);
    // col order: SDBL/A, SDHL/A, SDLL/A, TSL, TSA, SSL, SSA, TSL-TSA, KD, %BODY, %HEAD, %LEG
    const bodyDist = parsePair(str(sVals[0]));
    const headDist = parsePair(str(sVals[1]));
    const legDist = parsePair(str(sVals[2]));
    const ssl = parseNumber(sVals[5]);
    const ssa = parseNumber(sVals[6]);
    const kd = parseNumber(sVals[8]);
    const bodyPct = parsePercent(sVals[9]);
    const headPct = parsePercent(sVals[10]);
    const legPct = parsePercent(sVals[11]);

    const cRow = Array.isArray(clinchRows[index]) ? (clinchRows[index] as unknown[]) : [];
    const cVals = valuesAfterMeta(cRow);
    // SCBL SCBA SCHL SCHA SCLL SCLA RV SR TDL TDA TDS TKACC
    const clinchLanded =
      parseNumber(cVals[0]) + parseNumber(cVals[2]) + parseNumber(cVals[4]);
    const reversals = parseNumber(cVals[6]);
    const tdl = parseNumber(cVals[8]);
    const tda = parseNumber(cVals[9]);

    const gRow = Array.isArray(groundRows[index]) ? (groundRows[index] as unknown[]) : [];
    const gVals = valuesAfterMeta(gRow);
    // SGBL SGBA SGHL SGHA SGLL SGLA AD ADTB ADHG ADTM ADTS SM
    const groundLanded =
      parseNumber(gVals[0]) + parseNumber(gVals[2]) + parseNumber(gVals[4]);
    const advances =
      parseNumber(gVals[6]) +
      parseNumber(gVals[7]) +
      parseNumber(gVals[8]) +
      parseNumber(gVals[9]) +
      parseNumber(gVals[10]);
    const submissions = parseNumber(gVals[11]);

    const eventHit =
      eventByDateOpponent.get(`${meta.date}|${meta.opponentName ?? ""}`) ??
      [...eventByDateOpponent.entries()].find(([key]) => key.startsWith(`${meta.date}|`))?.[1];

    const status = eventHit && isRecord(eventHit.event.status) ? eventHit.event.status : null;
    const period = status ? Number(status.period) : null;
    const clock = status ? str(status.displayClock) : null;
    const minutes = parseClockToMinutes(
      Number.isFinite(period) ? period : null,
      clock,
    );
    const method =
      status && isRecord(status.result) ? str(status.result.displayName) ?? str(status.result.name) : null;
    const titleFight = Boolean(eventHit?.event.titleFight);
    const key = eventHit?.key ?? `${fighterId}-${meta.date}-${index}`;

    logs.push({
      competitionId: competitionIdFromKey(key),
      eventId: eventIdFromKey(key),
      date: meta.date,
      opponentId: meta.opponentId,
      opponentName: meta.opponentName,
      result: meta.result ?? parseResult(eventHit?.event.gameResult),
      method,
      round: Number.isFinite(period as number) ? (period as number) : null,
      time: clock,
      minutes,
      sigStrikesLanded: ssl,
      sigStrikesAttempted: ssa,
      knockdowns: kd,
      takedownsLanded: tdl,
      takedownsAttempted: tda,
      submissions,
      reversals,
      advances,
      headPct,
      bodyPct,
      legPct,
      distanceSigLanded: headDist.landed + bodyDist.landed + legDist.landed,
      clinchSigLanded: clinchLanded,
      groundSigLanded: groundLanded,
      titleFight,
    });
  });

  return logs;
}

export function aggregateLogs(logs: FightStatLog[]): {
  statistics: FighterStatBundle["statistics"];
  splits: FighterStatSplits;
} {
  if (logs.length === 0) {
    return { statistics: { ...EMPTY_STATISTICS }, splits: { ...EMPTY_SPLITS } };
  }

  let minutes = 0;
  let ssl = 0;
  let ssa = 0;
  let kd = 0;
  let tdl = 0;
  let tda = 0;
  let subs = 0;
  let reversals = 0;
  let advances = 0;
  let distance = 0;
  let clinch = 0;
  let ground = 0;
  let head = 0;
  let body = 0;
  let leg = 0;
  let pctN = 0;
  let fiveRound = 0;
  let titleFights = 0;
  let ufcFights = 0;

  for (const log of logs) {
    if (log.minutes && log.minutes > 0) minutes += log.minutes;
    ssl += log.sigStrikesLanded;
    ssa += log.sigStrikesAttempted;
    kd += log.knockdowns;
    tdl += log.takedownsLanded;
    tda += log.takedownsAttempted;
    subs += log.submissions;
    reversals += log.reversals;
    advances += log.advances;
    distance += log.distanceSigLanded;
    clinch += log.clinchSigLanded;
    ground += log.groundSigLanded;
    if (log.headPct != null && log.bodyPct != null && log.legPct != null) {
      head += log.headPct;
      body += log.bodyPct;
      leg += log.legPct;
      pctN += 1;
    }
    if ((log.round ?? 0) >= 5 || (log.minutes ?? 0) >= 25) fiveRound += 1;
    if (log.titleFight) titleFights += 1;
    ufcFights += 1;
  }

  const lastDate = logs
    .map((log) => log.date)
    .filter(Boolean)
    .sort()
    .at(-1);
  const daysSinceLastFight =
    lastDate && !Number.isNaN(Date.parse(lastDate))
      ? Math.max(0, Math.round((Date.now() - Date.parse(lastDate)) / 86_400_000))
      : null;

  return {
    statistics: {
      sigStrikesLandedPerMin: ratePerMin(ssl, minutes),
      sigStrikeAccuracy: ssa > 0 ? round1((ssl / ssa) * 100) : null,
      sigStrikesAbsorbedPerMin: null,
      strikingDefense: null,
      takedownsPer15: ratePer15(tdl, minutes),
      takedownAccuracy: tda > 0 ? round1((tdl / tda) * 100) : null,
      takedownDefense: null,
      submissionAttemptsPer15: ratePer15(subs, minutes),
      knockdownsPer15: ratePer15(kd, minutes),
    },
    splits: {
      headPct: pctN ? round1(head / pctN) : null,
      bodyPct: pctN ? round1(body / pctN) : null,
      legPct: pctN ? round1(leg / pctN) : null,
      distanceSigLanded: distance,
      clinchSigLanded: clinch,
      groundSigLanded: ground,
      reversals,
      advances,
      ufcFightCount: ufcFights,
      fiveRoundFightCount: fiveRound,
      daysSinceLastFight,
      titleFightCount: titleFights,
    },
  };
}

/** Second pass: fill absorbed/defense using opponent logs keyed by competition id. */
export function applyOpponentFacingStats(
  bundles: Map<string, FighterStatBundle>,
): void {
  const byComp = new Map<string, Array<{ fighterId: string; ssl: number; ssa: number; tdl: number; tda: number; minutes: number }>>();

  for (const [fighterId, bundle] of bundles) {
    for (const log of bundle.logs) {
      if (!log.competitionId || !log.minutes || log.minutes <= 0) continue;
      const list = byComp.get(log.competitionId) ?? [];
      list.push({
        fighterId,
        ssl: log.sigStrikesLanded,
        ssa: log.sigStrikesAttempted,
        tdl: log.takedownsLanded,
        tda: log.takedownsAttempted,
        minutes: log.minutes,
      });
      byComp.set(log.competitionId, list);
    }
  }

  for (const [fighterId, bundle] of bundles) {
    let absorbed = 0;
    let facedAttempts = 0;
    let minutes = 0;
    let tdFaced = 0;
    let tdAgainst = 0;

    for (const log of bundle.logs) {
      const others = (byComp.get(log.competitionId) ?? []).filter((item) => item.fighterId !== fighterId);
      if (others.length === 0 || !log.minutes || log.minutes <= 0) continue;
      const opp = others[0];
      absorbed += opp.ssl;
      facedAttempts += opp.ssa;
      minutes += log.minutes;
      tdFaced += opp.tda;
      tdAgainst += opp.tdl;
    }

    if (minutes > 0) {
      bundle.statistics.sigStrikesAbsorbedPerMin = ratePerMin(absorbed, minutes);
    }
    if (facedAttempts > 0) {
      const defended = facedAttempts - absorbed;
      bundle.statistics.strikingDefense = round1((Math.max(0, defended) / facedAttempts) * 100);
    }
    if (tdFaced > 0) {
      bundle.statistics.takedownDefense = round1(((tdFaced - tdAgainst) / tdFaced) * 100);
    }

    // Keep derived numbers tidy
    if (bundle.statistics.sigStrikesLandedPerMin != null) {
      bundle.statistics.sigStrikesLandedPerMin = round2(bundle.statistics.sigStrikesLandedPerMin);
    }
  }
}

export function buildStatBundle(fighterId: string, logs: FightStatLog[]): FighterStatBundle {
  const { statistics, splits } = aggregateLogs(logs);
  return {
    fighterId,
    logs,
    statistics,
    splits,
    derivedCareer: {
      finishRate: null,
      koWinRate: null,
      subWinRate: null,
      recentWinRate3: null,
      recentWinRate5: null,
    },
  };
}
