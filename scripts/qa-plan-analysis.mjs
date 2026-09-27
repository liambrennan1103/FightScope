/**
 * Plan gating + analysis UX QA.
 * Requires FIGHTSCOPE_ALLOW_DEV_PLAN=1 and NO FIGHTSCOPE_DEV_PLAN (cookie switches plans).
 */
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { readFileSync } from "node:fs";

const BASE = process.env.QA_BASE || "http://127.0.0.1:3035";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
}

const secret =
  process.env.AUTH_SECRET?.length >= 16
    ? process.env.AUTH_SECRET
    : "fightscope-dev-auth-secret-change-me";

async function token() {
  return new SignJWT({ email: "qa@fightscope.dev", name: "QA" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("fe166956-4633-4c32-afa6-d440c207ca6b")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));
}

async function main() {
  const browser = await chromium.launch({
    executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  });
  const out = {};

  async function withPlan(plan) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await ctx.addCookies([
      { name: "fs_session", value: await token(), domain: "127.0.0.1", path: "/" },
      { name: "fs_dev_plan", value: plan, domain: "127.0.0.1", path: "/" },
    ]);
    const page = await ctx.newPage();
    const api = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/analysis") && req.method() === "POST") api.push(req);
    });
    page.on("response", async (res) => {
      if (res.url().includes("/api/analysis") && res.request().method() === "POST") {
        try {
          const json = await res.json();
          api[api.length - 1] = { status: res.status(), json };
        } catch {
          api[api.length - 1] = { status: res.status() };
        }
      }
    });

    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(1000);
    await page.evaluate(() => localStorage.removeItem("fightscope:analysis-history"));

    const fightHref = await page.locator('a[href^="/app/fight/"]').first().getAttribute("href");
    await page.goto(`${BASE}${fightHref}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(1500);

    const result = {
      plan,
      fightHref,
      analyzeBtn: await page.getByRole("button", { name: /Analyze Fight/i }).count(),
      starterLabel: await page.getByText("Starter feature", { exact: false }).count(),
      lockIcon: await page.locator("button.fs-analyze-locked, button:has(svg)").filter({ hasText: /Analyze Fight/i }).count(),
    };

    if (plan === "free") {
      await page.getByRole("button", { name: /Analyze Fight/i }).click();
      await page.waitForTimeout(800);
      result.upgradePanel = await page.getByText(/Unlock Analyze Fight/i).count();
      result.apiCalls = api.length;
      result.apiStatus = api[0]?.status;
    } else {
      const started = Date.now();
      await page.getByRole("button", { name: /Analyze Fight/i }).click();
      // Wait for circular progress to appear
      await page.waitForTimeout(800);
      result.loaderVisible = await page.getByText(/Analyzing matchup/i).count();
      result.progressAppeared = await page.getByText(/%/).count() > 0;
      // Wait for Analyze again (loader ~5s + API)
      try {
        await page.getByRole("button", { name: /Analyze again/i }).waitFor({ timeout: 90000 });
      } catch {
        result.timeout = true;
      }
      result.loadMs = Date.now() - started;
      result.predictedEdge = await page.getByText(/Predicted edge/i).count();
      result.keyFactors = await page.getByText(/Key matchup factors/i).count();
      result.notAGuarantee = await page.getByText(/not a guarantee/i).count();
      // Wait for staggered reveal of locked Pro / Pro modules
      await page.waitForTimeout(2200);
      result.unlockPro = await page.getByText(/Unlock Pro analysis/i).count();
      result.deepAnalysisHeading = await page.getByText(/Deep analysis/i).count();
      result.ratingVisible = await page.getByText(/FightScope Rating/i).count();
      result.apiCalls = api.filter((a) => a && a.status).length;
      result.apiStatus = api.find((a) => a && a.status)?.status;
      const json = api.find((a) => a && a.json)?.json;
      result.responseTier = json?.analysis?.tier ?? json?.plan;
      result.hasPredictionObject = Boolean(json?.analysis?.prediction || json?.prediction);
      result.hasHowAWins = Boolean(json?.analysis?.prediction?.analysis?.howAWins);
      result.starterKeys = json?.analysis ? Object.keys(json.analysis).sort() : [];
      result.bodyHasDeepHow = (await page.locator("main").innerText()).includes("How ") &&
        (await page.locator("main").innerText()).match(/How \w+ wins/i);

      // responsive spot check
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      result.mobileOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      );
    }

    await ctx.close();
    return result;
  }

  // Ensure env doesn't force a single plan — cookie must win when DEV_PLAN unset.
  out.free = await withPlan("free");
  out.starter = await withPlan("starter");
  out.pro = await withPlan("pro");

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
