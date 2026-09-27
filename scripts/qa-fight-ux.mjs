import { chromium } from "playwright";
import { SignJWT } from "jose";
import { readFileSync } from "node:fs";

const BASE = process.env.QA_BASE || "http://127.0.0.1:3032";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
}

const secret =
  process.env.AUTH_SECRET?.length >= 16
    ? process.env.AUTH_SECRET
    : "fightscope-dev-auth-secret-change-me";

async function main() {
  const token = await new SignJWT({ email: "qa@fightscope.dev", name: "QA" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("fe166956-4633-4c32-afa6-d440c207ca6b")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));

  const browser = await chromium.launch({
    executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addCookies([
    { name: "fs_session", value: token, domain: "127.0.0.1", path: "/" },
  ]);
  const page = await ctx.newPage();
  const out = {};
  const api = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/analysis") && req.method() === "POST") api.push(1);
  });

  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1200);
  out.homeHasWinPct = await page.getByText(/% win|FightScope pick/i).count();
  out.homeAnalyzeCta = await page.getByText(/Analyze fight/i).count();

  const fightHref = await page
    .locator('a[href^="/app/fight/"]')
    .first()
    .getAttribute("href");
  out.fightHref = fightHref;

  // Clear history so reopen doesn't auto-show analysis
  await page.evaluate(() => localStorage.removeItem("fightscope:analysis-history"));

  await page.goto(`${BASE}${fightHref}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1500);

  out.notAnalyzedChip = await page.getByText("Not analyzed", { exact: false }).count();
  out.analyzeBtn = await page.getByRole("button", { name: /Analyze Fight/i }).count();
  out.pickBefore = await page.getByText(/Predicted winner|FightScope pick/i).count();
  out.deepStatsBefore = await page.getByText("FightScope ratings", { exact: true }).count();
  out.physicalFullBefore = await page.getByRole("heading", { name: "Physical" }).count();
  out.matchupDataLabel = await page.getByText("Matchup data", { exact: false }).count();
  out.apiOnOpen = api.length;
  out.bodySnippet = (await page.locator("main").innerText()).slice(0, 500);
  await page.screenshot({ path: ".pixel-diff/qa-pre-analysis.png" });

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  out.mobileAnalyzeVisible = await page
    .getByRole("button", { name: /Analyze Fight/i })
    .isVisible();
  out.mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
