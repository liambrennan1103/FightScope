import { chromium } from "playwright";
import { createSessionToken, SESSION_COOKIE } from "../src/server/auth/session";

async function main() {
  const token = await createSessionToken({
    id: "fe166956-4633-4c32-afa6-d440c207ca6b",
    email: "qa-v-18627cd0@fightscope.dev",
    name: "QA",
  });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    { name: SESSION_COOKIE, value: token, domain: "127.0.0.1", path: "/" },
  ]);
  const page = await context.newPage();
  const results: Record<string, unknown> = {};

  await page.goto("http://127.0.0.1:3030/app", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  results.homeUrl = page.url();
  results.sidebar = await page.locator('aside[aria-label="Primary"]').count();
  results.bottomNav = await page.locator('nav[aria-label="Mobile"]').count();
  results.homeAnalyzeLabels = await page.getByText("Analyze fight").count();
  results.brokenImgs = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((i) => i.offsetParent !== null && (!i.complete || i.naturalWidth === 0))
      .map((i) => ({ src: i.src.slice(-50), alt: i.alt }))
      .slice(0, 8),
  );
  results.portraitUnavailableAlt = await page.evaluate(
    () => [...document.querySelectorAll("img")].filter((i) => /portrait/i.test(i.alt || "")).length,
  );
  await page.screenshot({ path: ".pixel-diff/qa-app-home.png" });

  await page.goto("http://127.0.0.1:3030/app/events", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const eventLink = page.locator('a[href^="/app/events/"]').first();
  results.hasEvents = await eventLink.count();
  if ((await eventLink.count()) > 0) {
    await eventLink.click();
    await page.waitForTimeout(800);
    results.eventUrl = page.url();
    results.eventAnalyze = await page.getByText("Analyze", { exact: true }).count();
    results.eventBroken = await page.evaluate(
      () =>
        [...document.querySelectorAll("img")].filter(
          (i) => i.offsetParent !== null && (!i.complete || i.naturalWidth === 0),
        ).length,
    );
  }

  await page.goto("http://127.0.0.1:3030/app/fighters", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  results.fightersBroken = await page.evaluate(
    () =>
      [...document.querySelectorAll("img")].filter(
        (i) => i.offsetParent !== null && (!i.complete || i.naturalWidth === 0),
      ).length,
  );
  const fighterLink = page.locator('a[href^="/app/fighters/"]').first();
  await fighterLink.click();
  await page.waitForTimeout(800);
  results.fighterUrl = page.url();
  const compareBtn = page.getByRole("link", { name: /Compare/i }).first();
  results.compareBtnHref = await compareBtn.getAttribute("href");
  await compareBtn.click();
  await page.waitForTimeout(1000);
  results.compareUrl = page.url();
  results.compareHasParam = String(results.compareUrl).includes("?a=");
  results.compareSelectedName = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll("input")];
    return inputs.map((i) => i.value).filter(Boolean).slice(0, 3);
  });
  results.compareBroken = await page.evaluate(
    () =>
      [...document.querySelectorAll("img")].filter(
        (i) => i.offsetParent !== null && (!i.complete || i.naturalWidth === 0),
      ).length,
  );
  await page.screenshot({ path: ".pixel-diff/qa-compare-prefill.png" });

  await page.goto("http://127.0.0.1:3030/app/history", { waitUntil: "networkidle" });
  results.historyOk = page.url().includes("/history");
  results.historyInSidebar = await page.locator('aside a[href="/app/history"]').count();

  await page.goto("http://127.0.0.1:3030/app", { waitUntil: "networkidle" });
  const fightCard = page.locator('a[href^="/app/fight/"]').first();
  if ((await fightCard.count()) > 0) {
    await fightCard.click();
    await page.waitForTimeout(1000);
    results.fightUrl = page.url();
    results.analyzeButton = await page.getByRole("button", { name: /Analyze Fight/i }).count();
    results.fightHasPick = await page.getByText(/FightScope pick/i).count();
    await page.screenshot({ path: ".pixel-diff/qa-fight-gated.png" });
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
