import { chromium } from "playwright";
import { SignJWT } from "jose";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.QA_BASE || "http://127.0.0.1:3031";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore
  }
}

loadEnv();

async function createToken() {
  const secret =
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
      ? process.env.AUTH_SECRET
      : "fightscope-dev-auth-secret-change-me";
  return new SignJWT({ email: "qa@fightscope.dev", name: "QA" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("fe166956-4633-4c32-afa6-d440c207ca6b")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));
}

async function main() {
  const token = await createToken();
  const browser = await chromium.launch({
    executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addCookies([
    { name: "fs_session", value: token, domain: "127.0.0.1", path: "/" },
  ]);
  const page = await context.newPage();
  const out = {};

  // Compare draft persistence
  await page.goto(`${BASE}/app/compare?a=ilia-topuria&b=islam-makhachev`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1200);
  let text = await page.locator("main").innerText();
  out.draftPrefill =
    text.includes("Ilia Topuria") && text.includes("Islam Makhachev");

  await page.goto(`${BASE}/app/fighters`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.goto(`${BASE}/app/compare`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  text = await page.locator("main").innerText();
  out.draftSurvived =
    text.includes("Ilia Topuria") && text.includes("Islam Makhachev");
  out.draftUrl = page.url();

  await page.getByRole("button", { name: /Clear/i }).click();
  await page.waitForTimeout(800);
  out.afterClear = (await page.locator("main").innerText()).includes(
    "Ilia Topuria",
  );

  // Find upcoming fight with Analyze Fight
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1200);
  const fightHrefs = await page
    .locator('a[href^="/app/fight/"]')
    .evaluateAll((as) => [
      ...new Set(as.map((a) => a.getAttribute("href")).filter(Boolean)),
    ]);

  let found = null;
  for (const href of fightHrefs.slice(0, 15)) {
    await page.goto(`${BASE}${href}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(1000);
    const btn = await page
      .getByRole("button", { name: /Analyze Fight/i })
      .count();
    if (btn > 0) {
      found = href;
      break;
    }
  }
  out.foundFight = found;

  const apiCalls = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/analysis") && req.method() === "POST") {
      apiCalls.push(req.url());
    }
  });

  if (found) {
    out.apiBeforeClick = apiCalls.length;
    await page.getByRole("button", { name: /Analyze Fight/i }).click();
    try {
      await page
        .getByRole("button", { name: /Analyze again/i })
        .waitFor({ timeout: 60000 });
    } catch {
      out.analyzeTimeout = true;
    }
    out.apiAfterClick = apiCalls.length;
    out.analyzeAgain = await page
      .getByRole("button", { name: /Analyze again/i })
      .count();
    out.pickVisible = await page.getByText(/Predicted winner|FightScope pick/i).count();
    out.winPctVisible = await page.getByText(/% win probability/i).count();
    out.notAnalyzedGone = await page.getByText("Not analyzed", { exact: false }).count();
    out.analysisAvailable = await page.getByText(/Analysis available/i).count();
    out.analyzeBody = (await page.locator("main").innerText()).slice(0, 600);
    await page.screenshot({ path: ".pixel-diff/qa-analyze-result.png" });

    await page.goto(`${BASE}/app/history`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    out.historyBody = (await page.locator("main").innerText()).slice(0, 450);
    const beforeHist = apiCalls.length;
    const histLink = page.locator('a[href^="/app/history/"]').first();
    if (await histLink.count()) {
      await histLink.click();
      await page.waitForTimeout(1500);
      out.historyDetailUrl = page.url();
      out.apiOnHistoryOpen = apiCalls.length - beforeHist;
    }
  }

  // Direct API check (may use cache)
  out.apiDirect = await page.evaluate(async () => {
    const res = await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fighterAId: "4350812",
        fighterBId: "3332412",
        rounds: 5,
        isTitle: true,
        division: "Lightweight",
      }),
    });
    const json = await res.json();
    return {
      status: res.status,
      a: json.prediction?.fighterAWinPct,
      b: json.prediction?.fighterBWinPct,
      sum:
        (json.prediction?.fighterAWinPct ?? 0) +
        (json.prediction?.fighterBWinPct ?? 0),
      explanationSource: json.prediction?.analysis?.explanationSource,
      error: json.error,
    };
  });

  // Fighter compare CTA + images + sidebar
  await page.goto(`${BASE}/app/fighters/ilia-topuria`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(800);
  out.compareCta = await page
    .locator("main a")
    .evaluateAll((as) =>
      as
        .filter((a) => /Compare this fighter/i.test(a.textContent || ""))
        .map((a) => a.getAttribute("href")),
    );
  out.realBrokenImgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter(
        (i) =>
          i.complete &&
          i.naturalWidth === 0 &&
          !/\.svg(\?|$)/i.test(i.currentSrc || i.src),
      )
      .map((i) => i.currentSrc),
  );
  out.sidebar = await page
    .locator('aside[aria-label="Primary"] a')
    .evaluateAll((as) =>
      as.map((a) => ({
        href: a.getAttribute("href"),
        text: (a.textContent || "").trim(),
      })),
    );

  // Home: no analysis API on load
  const beforeHome = apiCalls.length;
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1000);
  out.apiOnHomeLoad = apiCalls.length - beforeHome;
  out.homeAnalyzeCtas = await page.getByText("Analyze fight").count();

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
