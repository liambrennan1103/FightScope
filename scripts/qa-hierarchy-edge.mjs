/**
 * Capture Predicted Edge hierarchy after shots (Holmes vs Rodrigues).
 * Seeds localStorage history so we don't depend on a live Anthropic call.
 * Usage: QA_BASE=http://127.0.0.1:3033 node scripts/qa-hierarchy-edge.mjs
 */
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { readFileSync, mkdirSync } from "node:fs";

const BASE = process.env.QA_BASE || "http://127.0.0.1:3033";
const FIGHT = "/app/fight/brandon-holmes-vs-modestino-rodrigues-911589";
const SLUG = "brandon-holmes-vs-modestino-rodrigues-911589";

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

const historyItem = {
  id: "qa-hierarchy-holmes-rodrigues",
  fighterAId: "5296762",
  fighterBId: "5364355",
  fighterASlug: "brandon-holmes",
  fighterBSlug: "modestino-rodrigues",
  fighterAName: "Brandon Holmes",
  fighterBName: "Modestino Rodrigues",
  fighterAPortrait: { src: null, objectPosition: "50% 14%", status: "fallback" },
  fighterBPortrait: { src: null, objectPosition: "50% 14%", status: "fallback" },
  eventName: "Dana White's Contender Series: Season 10, Week 4",
  fightSlug: SLUG,
  predictedWinnerId: "5364355",
  fighterAWinPct: 38,
  fighterBWinPct: 62,
  confidence: "Medium",
  prediction: {
    fighterAWinPct: 38,
    fighterBWinPct: 62,
    predictedWinnerId: "5364355",
    confidence: "Medium",
    methods: { koTko: 42, decision: 48, submission: 10 },
    analysis: {
      fightscopeRead:
        "Rodrigues holds the matchup edge on current form and pace.",
      howAWins: "Holmes needs early pressure.",
      howBWins: "Rodrigues banks cleaner minutes.",
    },
    keyAdvantages: {
      fighterA: ["Reach parity"],
      fighterB: ["Recent form", "Cardio"],
    },
  },
  createdAt: new Date().toISOString(),
};

async function main() {
  mkdirSync(".pixel-diff", { recursive: true });
  const token = await new SignJWT({ email: "qa@fightscope.dev", name: "QA" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("fe166956-4633-4c32-afa6-d440c207ca6b")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));

  const browser = await chromium.launch({
    executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const host = new URL(BASE).hostname;
  await ctx.addCookies([
    { name: "fs_session", value: token, domain: host, path: "/" },
  ]);
  const page = await ctx.newPage();

  // Seed origin storage before fight page hydrate
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.evaluate((item) => {
    localStorage.setItem("fightscope:analysis-history", JSON.stringify([item]));
    localStorage.setItem(
      "fightscope-plan",
      JSON.stringify({ plan: "starter" }),
    );
  }, historyItem);

  await page.goto(`${BASE}${FIGHT}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);

  const bodyText = await page.locator("body").innerText();
  if (!/Predicted edge/i.test(bodyText)) {
    console.log("NO_EDGE_PAGE", bodyText.slice(0, 1500));
    await page.screenshot({ path: ".pixel-diff/hierarchy-debug.png", fullPage: true });
    throw new Error("Predicted edge not found after history hydrate");
  }

  await page.waitForTimeout(1200);

  for (const width of [1440, 375]) {
    await page.setViewportSize({
      width,
      height: width < 500 ? 1100 : 1200,
    });
    await page.waitForTimeout(500);
    await page.locator("text=Predicted edge").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.locator("main").screenshot({
      path: `.pixel-diff/hierarchy-after-${width}.png`,
    });
  }

  const text = await page.locator("main").innerText();
  const checks = {
    hasHeadline: /holds the edge/i.test(text),
    hasWhyEdge: /Why the edge/i.test(text),
    hasWhyFavoredDup: /Why .+ is favored/i.test(text),
    hasEdgePathCruft: /Edge path currently reads/i.test(text),
    hasFormStat: /90\/100/.test(text) && /73\/100/.test(text),
    hasScenarios: /Fight scenarios/i.test(text),
    hasFactors: /Key matchup factors/i.test(text),
    hasConnector: /Numbers below/i.test(text),
    snippet: text.match(/Predicted edge[\s\S]{0,900}/)?.[0]?.slice(0, 700) ?? "",
  };
  console.log(JSON.stringify(checks, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
