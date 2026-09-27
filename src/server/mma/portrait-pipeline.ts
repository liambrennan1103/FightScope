import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { espnPortraitSrc } from "../../data/portrait-constants";

export const ESPN_HEADSHOT = (id: string) =>
  `https://a.espncdn.com/i/headshots/mma/players/full/${id}.png`;

export const LOCAL_ESPN_PATH = espnPortraitSrc;

const MIN_BYTES = 12_000;
const MIN_EDGE = 120;

export type PortraitIndexEntry = {
  src: string;
  status: "approved" | "rejected" | "missing";
  source: "espn-headshot" | "curated" | "ufc-headshot" | "remote-headshot";
  bytes?: number;
  width?: number;
  height?: number;
  reason?: string;
};

export type PortraitIndexFile = {
  generatedAt: string;
  source: string;
  entries: Record<string, PortraitIndexEntry>;
};

export type PortraitCoverageReport = {
  generatedAt: string;
  roster: number;
  approved: number;
  rejected: number;
  missing: number;
  unresolved: Array<{ id: string; name?: string; reason: string }>;
};

export function pngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
}

/** Convert JPEG/WebP-ish buffers to PNG when possible (macOS sips). */
export function ensurePngBuffer(buffer: Buffer, cwd = process.cwd()): Buffer | null {
  if (isPng(buffer)) return buffer;
  if (!isJpeg(buffer)) return null;
  const tmpDir = path.join(cwd, ".data", "portrait-tmp");
  mkdirSync(tmpDir, { recursive: true });
  const inFile = path.join(tmpDir, `in-${process.pid}-${Date.now()}.jpg`);
  const outFile = path.join(tmpDir, `out-${process.pid}-${Date.now()}.png`);
  try {
    writeFileSync(inFile, buffer);
    execFileSync("sips", ["-s", "format", "png", inFile, "--out", outFile], {
      stdio: "ignore",
      timeout: 20000,
    });
    if (!existsSync(outFile)) return null;
    return readFileSync(outFile);
  } catch {
    return null;
  } finally {
    try {
      if (existsSync(inFile)) writeFileSync(inFile, Buffer.alloc(0));
    } catch {
      /* ignore */
    }
  }
}

export function validatePortraitBuffer(
  buffer: Buffer,
): { ok: true; width: number; height: number } | { ok: false; reason: string } {
  if (buffer.length < MIN_BYTES) {
    return { ok: false, reason: `too small (${buffer.length} bytes)` };
  }
  const size = pngDimensions(buffer);
  if (!size) {
    return { ok: false, reason: "not a png" };
  }
  if (size.width < MIN_EDGE || size.height < MIN_EDGE) {
    return { ok: false, reason: `undersized ${size.width}x${size.height}` };
  }
  const ratio = size.width / size.height;
  if (ratio > 2.4 || ratio < 0.45) {
    return { ok: false, reason: `extreme aspect ${size.width}x${size.height}` };
  }
  return { ok: true, width: size.width, height: size.height };
}

export function portraitsDir(cwd = process.cwd()): string {
  return path.join(cwd, "public", "portraits", "espn");
}

export function ensurePortraitsDir(cwd = process.cwd()): string {
  const dir = portraitsDir(cwd);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function isPlaceholderImageUrl(url: string): boolean {
  return /SHADOW|silhouette|misc_logos|espn\/misc|default-source\/missing|placeholder/i.test(url);
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  const response = await fetch(url, {
    headers: {
      Accept: "image/png,image/jpeg,image/webp,image/*",
      "User-Agent": "FightScope/1.0 (MMA analytics)",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`image fetch failed (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

function approveBuffer(
  id: string,
  buffer: Buffer,
  source: PortraitIndexEntry["source"],
  cwd: string,
): PortraitIndexEntry {
  const png = ensurePngBuffer(buffer, cwd) ?? (isPng(buffer) ? buffer : null);
  if (!png) {
    return {
      src: LOCAL_ESPN_PATH(id),
      status: "rejected",
      source,
      bytes: buffer.length,
      reason: "unsupported image type",
    };
  }
  const check = validatePortraitBuffer(png);
  if (!check.ok) {
    return {
      src: LOCAL_ESPN_PATH(id),
      status: "rejected",
      source,
      bytes: png.length,
      reason: check.reason,
    };
  }
  const dest = path.join(ensurePortraitsDir(cwd), `${id}.png`);
  writeFileSync(dest, png);
  return {
    src: LOCAL_ESPN_PATH(id),
    status: "approved",
    source,
    bytes: png.length,
    width: check.width,
    height: check.height,
  };
}

export async function fetchEspnHeadshot(id: string): Promise<Buffer | null> {
  return fetchImageBuffer(ESPN_HEADSHOT(id));
}

export async function cacheEspnHeadshot(
  id: string,
  cwd = process.cwd(),
  options?: { force?: boolean },
): Promise<PortraitIndexEntry> {
  const dest = path.join(ensurePortraitsDir(cwd), `${id}.png`);
  if (!options?.force && existsSync(dest)) {
    const existing = readFileSync(dest);
    const cached = validatePortraitBuffer(existing);
    if (cached.ok) {
      return {
        src: LOCAL_ESPN_PATH(id),
        status: "approved",
        source: "espn-headshot",
        bytes: existing.length,
        width: cached.width,
        height: cached.height,
      };
    }
  }
  try {
    const buffer = await fetchEspnHeadshot(id);
    if (!buffer) {
      return { src: LOCAL_ESPN_PATH(id), status: "missing", source: "espn-headshot", reason: "espn 404" };
    }
    return approveBuffer(id, buffer, "espn-headshot", cwd);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "fetch failed";
    if (existsSync(dest)) {
      const existing = readFileSync(dest);
      const cached = validatePortraitBuffer(existing);
      if (cached.ok) {
        return {
          src: LOCAL_ESPN_PATH(id),
          status: "approved",
          source: "espn-headshot",
          bytes: existing.length,
          width: cached.width,
          height: cached.height,
          reason: `kept cache (${reason})`,
        };
      }
    }
    return { src: LOCAL_ESPN_PATH(id), status: "missing", source: "espn-headshot", reason };
  }
}

export async function cacheRemoteHeadshot(
  id: string,
  url: string | null | undefined,
  cwd = process.cwd(),
): Promise<PortraitIndexEntry | null> {
  if (!url || isPlaceholderImageUrl(url)) return null;
  try {
    const buffer = await fetchImageBuffer(url);
    if (!buffer) return null;
    return approveBuffer(id, buffer, "remote-headshot", cwd);
  } catch {
    return null;
  }
}

export async function cacheUfcHeadshot(
  id: string,
  name: string,
  slug?: string,
  cwd = process.cwd(),
): Promise<PortraitIndexEntry> {
  const slugCandidates = [
    slug,
    slugifyName(name),
    slugifyName(name.replace(/'/g, "")),
  ].filter((item, index, arr): item is string => Boolean(item) && arr.indexOf(item) === index);

  for (const candidate of slugCandidates) {
    try {
      const page = await fetch(`https://www.ufc.com/athlete/${candidate}`, {
        headers: { Accept: "text/html", "User-Agent": "FightScope/1.0 (MMA analytics)" },
        signal: AbortSignal.timeout(12000),
        redirect: "follow",
      });
      if (!page.ok) continue;
      const html = await page.text();
      if (/Search results\s*\|\s*UFC/i.test(html) || /no athletes found/i.test(html)) continue;

      const og =
        html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ||
        html.match(/content="([^"]+)"\s+property="og:image"/i)?.[1];
      const hero =
        html.match(/https:\/\/[^"'\s]+\/images\/[^"'\s]+\.(?:png|jpe?g|webp)/i)?.[0] ||
        html.match(/https:\/\/ufc\.com\/images\/[^"'\s]+\.(?:png|jpe?g|webp)/i)?.[0];

      for (const imageUrl of [og, hero]) {
        if (!imageUrl || isPlaceholderImageUrl(imageUrl)) continue;
        const buffer = await fetchImageBuffer(imageUrl);
        if (!buffer) continue;
        const approved = approveBuffer(id, buffer, "ufc-headshot", cwd);
        if (approved.status === "approved") return approved;
      }
    } catch {
      continue;
    }
  }
  return { src: LOCAL_ESPN_PATH(id), status: "missing", source: "ufc-headshot", reason: "ufc athlete page not found" };
}

/**
 * Wikipedia / Wikimedia only when the page clearly refers to an MMA/UFC fighter.
 * Avoids grabbing random same-name people.
 */
export async function cacheWikipediaHeadshot(
  id: string,
  name: string,
  cwd = process.cwd(),
): Promise<PortraitIndexEntry> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      `${name} UFC`,
    )}&limit=5&namespace=0&format=json`;
    const search = await fetch(searchUrl, {
      headers: { "User-Agent": "FightScope/1.0 (portrait ingest; fightscope.app)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!search.ok) {
      return { src: LOCAL_ESPN_PATH(id), status: "missing", source: "remote-headshot", reason: "wiki search failed" };
    }
    const payload = (await search.json()) as [string, string[]];
    const titles = payload[1] ?? [];
    for (const title of titles) {
      const summary = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          headers: { "User-Agent": "FightScope/1.0 (portrait ingest; fightscope.app)" },
          signal: AbortSignal.timeout(12000),
        },
      );
      if (!summary.ok) continue;
      const json = (await summary.json()) as {
        extract?: string;
        description?: string;
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
        type?: string;
      };
      if (json.type === "disambiguation") continue;
      const text = `${json.extract ?? ""} ${json.description ?? ""}`.toLowerCase();
      const isMma = /\b(mma|mixed martial|ufc|bellator|pfl|one championship|contender series)\b/.test(
        text,
      );
      if (!isMma) continue;
      const imageUrl = json.originalimage?.source || json.thumbnail?.source;
      if (!imageUrl || isPlaceholderImageUrl(imageUrl)) continue;
      const buffer = await fetchImageBuffer(imageUrl.split("?")[0] ?? imageUrl);
      if (!buffer) continue;
      const approved = approveBuffer(id, buffer, "remote-headshot", cwd);
      if (approved.status === "approved") return approved;
    }
  } catch {
    /* fall through */
  }
  return {
    src: LOCAL_ESPN_PATH(id),
    status: "missing",
    source: "remote-headshot",
    reason: "no verified mma wikipedia image",
  };
}

function slugifyName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function writePortraitArtifacts(
  index: PortraitIndexFile,
  coverage: PortraitCoverageReport,
  cwd = process.cwd(),
) {
  const dataDir = path.join(cwd, "src", "data");
  writeFileSync(path.join(dataDir, "portrait-index.json"), `${JSON.stringify(index)}\n`);
  writeFileSync(path.join(dataDir, "portrait-coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`);
  writeFileSync(
    path.join(dataDir, "missingPortraits.json"),
    `${JSON.stringify({ generatedAt: coverage.generatedAt, unresolved: coverage.unresolved }, null, 2)}\n`,
  );
}

export function readExistingPortraitIndex(cwd = process.cwd()): PortraitIndexFile | null {
  const file = path.join(cwd, "src", "data", "portrait-index.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as PortraitIndexFile;
  } catch {
    return null;
  }
}
