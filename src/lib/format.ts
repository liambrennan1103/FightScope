import type { RecordLine } from "./types";

export const UNAVAILABLE = "—";

export function formatRecord(record: RecordLine): string {
  const base = `${record.wins}–${record.losses}–${record.draws}`;
  if (record.noContests && record.noContests > 0) {
    return `${base} (${record.noContests} NC)`;
  }
  return base;
}

export function cmToImperial(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  if (inches === 12) {
    return `${feet + 1}'0"`;
  }
  return `${feet}'${inches}"`;
}

export function formatHeight(cm: number | null | undefined): string {
  if (cm == null || !Number.isFinite(cm) || cm <= 0) return UNAVAILABLE;
  return `${cmToImperial(cm)} · ${Math.round(cm)} cm`;
}

export function formatReach(cm: number | null | undefined): string {
  if (cm == null || !Number.isFinite(cm) || cm <= 0) return UNAVAILABLE;
  const inches = Math.round(cm / 2.54);
  return `${inches}" · ${Math.round(cm)} cm`;
}

export function parseDate(iso: string): Date {
  if (iso.includes("T")) return new Date(iso);
  return new Date(`${iso}T12:00:00`);
}

export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDate(iso);
  if (Number.isNaN(date.getTime())) return UNAVAILABLE;
  return new Intl.DateTimeFormat("en-US", {
    weekday: options?.weekday,
    month: options?.month ?? "short",
    day: options?.day ?? "numeric",
    year: options?.year ?? "numeric",
    ...options,
  }).format(date);
}

export function formatEventDate(iso: string): string {
  return formatDate(iso, { weekday: "long", month: "long", day: "numeric" });
}

/** Local clock time when the ISO string includes a real time component. */
export function formatEventTime(iso: string): string | null {
  if (!iso.includes("T")) return null;
  const date = parseDate(iso);
  if (Number.isNaN(date.getTime())) return null;
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  // Midnight-only stamps are usually date placeholders — skip them.
  if (hours === 0 && minutes === 0) return null;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatEventDateTime(iso: string): string {
  const date = formatEventDate(iso);
  const time = formatEventTime(iso);
  return time ? `${date} · ${time}` : date;
}

export function formatCompactDate(iso: string): string {
  return formatDate(iso, { weekday: undefined, month: "short", day: "numeric" }).toUpperCase();
}

export function eventDateParts(iso: string): { month: string; day: string } {
  const date = parseDate(iso);
  if (Number.isNaN(date.getTime())) return { month: "—", day: "—" };
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toUpperCase(),
    day: new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date),
  };
}

export function formatCity(location: string): string {
  return location.split(",")[0]?.trim().toUpperCase() ?? location;
}

export function flagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return "";
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function rankingLabel(ranking: number | "C" | null): string | null {
  if (ranking === "C") return "Champion";
  if (typeof ranking === "number") return `#${ranking}`;
  return null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatUpdated(iso: string, now = new Date()): string {
  const then = parseDate(iso);
  if (Number.isNaN(then.getTime())) return "";
  const delta = now.getTime() - then.getTime();
  if (delta < 2 * 60 * 60 * 1000) return "Updated recently";
  if (delta < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.round(delta / (60 * 60 * 1000)));
    return `Updated ${hours}h ago`;
  }
  return `Last updated ${formatCompactDate(iso)}`;
}

export function displayValue(value: string | number | null | undefined): string {
  if (value == null || value === "") return UNAVAILABLE;
  return String(value);
}
