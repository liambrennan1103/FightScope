/**
 * Visual regression: compare rendered landing at 1366px to reference PNG.
 * Usage: node scripts/landing-pixel-diff.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, ".pixel-diff");
const referencePath = path.join(root, "public/landing-reference/reference_1366x5685.png");
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";
const width = 1366;
const height = 5685;
const threshold = 0.1;

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready;
});
await page.waitForTimeout(1500);

const shotPath = path.join(outDir, "actual.png");
await page.screenshot({ path: shotPath, fullPage: true });
await browser.close();

const ref = PNG.sync.read(readFileSync(referencePath));
const actual = PNG.sync.read(readFileSync(shotPath));

if (ref.width !== actual.width || ref.height !== actual.height) {
  console.error(
    `Dimension mismatch: ref ${ref.width}x${ref.height} vs actual ${actual.width}x${actual.height}`,
  );
  process.exit(1);
}

const diff = new PNG({ width: ref.width, height: ref.height });
const mismatched = pixelmatch(ref.data, actual.data, diff.data, ref.width, ref.height, {
  threshold,
  includeAA: false,
});

const diffPath = path.join(outDir, "diff.png");
writeFileSync(diffPath, PNG.sync.write(diff));

const total = ref.width * ref.height;
const pct = ((mismatched / total) * 100).toFixed(2);
console.log(`Mismatched pixels: ${mismatched} / ${total} (${pct}%)`);
console.log(`Actual: ${shotPath}`);
console.log(`Diff:   ${diffPath}`);

if (mismatched > total * 0.05) {
  process.exit(2);
}
