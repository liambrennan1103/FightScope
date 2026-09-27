import { chromium } from "playwright";
import { SignJWT } from "jose";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  return new SignJWT({ email: "qa-v-18627cd0@fightscope.dev", name: "QA" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("fe166956-4633-4c32-afa6-d440c207ca6b")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));
}

async function main() {
  const token = await createToken();
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addCookies([
    { name: "fs_session", value: token, domain: "127.0.0.1", path: "/" },
  ]);
  const page = await context.newPage();
  const results = {};
  page.on("pageerror", (e) => {
    results.pageErrors = (results.pageErrors || []).concat(
      String(e.message).slice(0, 200),
    );
  });

  await page.goto("http://127.0.0.1:3030/app", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2000);
  results.homeUrl = page.url();
  results.sidebar = await page.locator('aside[aria-label="Primary"]').count();
  results.homeAnalyzeLabels = await page.getByText("Analyze fight").count();
  results.brokenImgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter(
        (i) =>
          i.offsetParent !== null && (!i.complete || i.naturalWidth === 0),
      )
      .map((i) => ({
        src: (i.currentSrc || i.src).slice(-80),
        alt: i.alt,
      }))
      .slice(0, 8),
  );
  results.portraitAlt = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((i) => /portrait/i.test(i.alt || ""))
      .map((i) => i.alt)
      .slice(0, 5),
  );
  results.bodyStart = (
    await page
      .locator("main")
      .innerText()
      .catch(() => page.locator("body").innerText())
  ).slice(0, 500);
  await page.screenshot({ path: ".pixel-diff/qa-app-home.png" });

  await page.goto("http://127.0.0.1:3030/app/events", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1000);
  const eventLink = page.locator('a[href^="/app/events/"]').first();
  results.hasEvents = await eventLink.count();
  if (await eventLink.count()) {
    await eventLink.click();
    await page.waitForTimeout(1500);
    results.eventUrl = page.url();
    results.eventAnalyze = await page
      .getByText("Analyze", { exact: true })
      .count();
    results.eventBroken = await page.evaluate(
      () =>
        [...document.querySelectorAll("img")].filter(
          (i) =>
            i.offsetParent !== null && (!i.complete || i.naturalWidth === 0),
        ).length,
    );
  }

  await page.goto("http://127.0.0.1:3030/app/fighters", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1000);
  results.fightersBroken = await page.evaluate(
    () =>
      [...document.querySelectorAll("img")].filter(
        (i) =>
          i.offsetParent !== null && (!i.complete || i.naturalWidth === 0),
      ).length,
  );
  const fighterLink = page.locator('a[href^="/app/fighters/"]').first();
  if (await fighterLink.count()) {
    await fighterLink.click();
    await page.waitForTimeout(1200);
    results.fighterUrl = page.url();
    const compareBtn = page.getByRole("link", { name: /Compare/i }).first();
    results.compareBtnHref = await compareBtn.getAttribute("href");
    await compareBtn.click();
    await page.waitForTimeout(1500);
    results.compareUrl = page.url();
    results.compareHasParam = /[?&]a=/.test(results.compareUrl);
    results.compareBody = (await page.locator("main").innerText()).slice(
      0,
      600,
    );
    results.compareBroken = await page.evaluate(
      () =>
        [...document.querySelectorAll("img")].filter(
          (i) =>
            i.offsetParent !== null && (!i.complete || i.naturalWidth === 0),
        ).length,
    );
    await page.screenshot({ path: ".pixel-diff/qa-compare-prefill.png" });
  }

  await page.goto("http://127.0.0.1:3030/app/history", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(600);
  results.historyOk = page.url().includes("/history");
  results.historyInSidebar = await page
    .locator('aside a[href="/app/history"]')
    .count();
  results.historyBody = (
    await page
      .locator("main")
      .innerText()
      .catch(() => "")
  ).slice(0, 300);

  await page.goto("http://127.0.0.1:3030/app", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1000);
  const fightCard = page.locator('a[href^="/app/fight/"]').first();
  if (await fightCard.count()) {
    await fightCard.click();
    await page.waitForTimeout(1500);
    results.fightUrl = page.url();
    results.analyzeButton = await page
      .getByRole("button", { name: /Analyze Fight/i })
      .count();
    results.fightHasPick = await page.getByText(/FightScope pick/i).count();
    results.fightBody = (await page.locator("main").innerText()).slice(0, 700);
    await page.screenshot({ path: ".pixel-diff/qa-fight-gated.png" });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3030/app", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(600);
  results.mobileAsideVisible = await page
    .locator('aside[aria-label="Primary"]')
    .isVisible()
    .catch(() => false);
  results.mobileMenuBtn = await page
    .getByRole("button", { name: /menu|open navigation/i })
    .count();

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
