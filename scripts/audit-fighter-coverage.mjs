#!/usr/bin/env node
/**
 * Fighter coverage audit — launch readiness report.
 *
 * Usage: node scripts/audit-fighter-coverage.mjs
 * Writes: src/data/fighter-coverage-report.json
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const snapshotPath = path.join(ROOT, "src/server/mma/snapshot.json");
const indexPath = path.join(ROOT, "src/data/portrait-index.json");
const missingPath = path.join(ROOT, "src/data/missingPortraits.json");
const espnDir = path.join(ROOT, "public/portraits/espn");
const outPath = path.join(ROOT, "src/data/fighter-coverage-report.json");

function loadJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

const snapshot = loadJson(snapshotPath);
const index = existsSync(indexPath) ? loadJson(indexPath) : { entries: {} };
const missingFile = existsSync(missingPath) ? loadJson(missingPath) : { unresolved: [] };

const fighters = snapshot.fighters ?? [];
const entries = index.entries ?? {};
const diskIds = existsSync(espnDir)
  ? new Set(
      readdirSync(espnDir)
        .filter((f) => f.endsWith(".png"))
        .map((f) => f.replace(/\.png$/i, "")),
    )
  : new Set();

const withApproved = [];
const missingPortrait = [];
const brokenFile = [];
const incompleteProfile = [];

for (const f of fighters) {
  const entry = entries[f.id];
  const onDisk = diskIds.has(f.id);
  const filePath = path.join(espnDir, `${f.id}.png`);
  const bytes = onDisk && existsSync(filePath) ? statSync(filePath).size : 0;

  const incomplete = [];
  if (f.reachCm == null) incomplete.push("reach");
  if (f.age == null) incomplete.push("age");
  if (!f.stance) incomplete.push("stance");
  if ((f.recentFights?.length ?? 0) < 1) incomplete.push("recentFights");
  if (f.statistics?.sigStrikesLandedPerMin == null) incomplete.push("strikingRates");

  if (incomplete.length) {
    incompleteProfile.push({
      id: f.id,
      name: f.name,
      missingFields: incomplete,
    });
  }

  if (entry?.status === "approved" && onDisk && bytes > 12_000) {
    withApproved.push(f.id);
  } else if (onDisk && bytes > 0 && bytes < 12_000) {
    brokenFile.push({ id: f.id, name: f.name, bytes, reason: "file too small" });
  } else if (/^opponent tba$/i.test(f.name) || /^tba$/i.test(f.name)) {
    // Intentional placeholder stubs — not launch blockers
    continue;
  } else {
    missingPortrait.push({
      id: f.id,
      name: f.name,
      slug: f.slug,
      indexStatus: entry?.status ?? "absent",
      indexReason: entry?.reason ?? missingFile.unresolved?.find((u) => u.id === f.id)?.reason ?? "no portrait",
      onDisk,
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    fightersInSnapshot: fighters.length,
    portraitIndexEntries: Object.keys(entries).length,
    approvedOnDiskMatchingSnapshot: withApproved.length,
    missingOrUnresolvedPortraits: missingPortrait.length,
    brokenPortraitFiles: brokenFile.length,
    incompleteProfiles: incompleteProfile.length,
    espnPngFilesOnDisk: diskIds.size,
    coveragePct: fighters.length
      ? Math.round((withApproved.length / fighters.length) * 1000) / 10
      : 0,
  },
  missingPortraits: missingPortrait,
  brokenPortraitFiles: brokenFile,
  incompleteProfilesSample: incompleteProfile.slice(0, 40),
  incompleteProfilesTotal: incompleteProfile.length,
  notes: [
    "Approved = portrait-index status approved AND local PNG > 12KB.",
    "Most unresolved Contender Series prospects fail ESPN headshot CDN (404).",
    "Incomplete profile counts missing reach/age/stance/recentFights/striking rates — common for new prospects.",
  ],
};

writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.totals, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`Missing portraits (${missingPortrait.length}):`);
for (const m of missingPortrait) {
  console.log(`  - ${m.name} (${m.id}): ${m.indexReason}`);
}
