#!/usr/bin/env node
/**
 * Fetch licensed city photography into public/events/backgrounds/.
 * Run locally when outbound network allows Wikimedia/Unsplash.
 *
 * Usage: node scripts/fetch-event-backgrounds.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEST = path.join(process.cwd(), "public/events/backgrounds");
mkdirSync(DEST, { recursive: true });

/** Wikimedia Commons thumbnails — CC / public domain photography. */
const ASSETS = [
  {
    id: "vegas",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Las_Vegas_Strip_panorama.jpg/1600px-Las_Vegas_Strip_panorama.jpg",
  },
  {
    id: "paris",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/1600px-Tour_Eiffel_Wikimedia_Commons.jpg",
  },
  {
    id: "mexico",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Mexico_City_Reforma_Avenue.jpg/1600px-Mexico_City_Reforma_Avenue.jpg",
  },
  {
    id: "abu-dhabi",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Abu_Dhabi_Skyline.jpg/1600px-Abu_Dhabi_Skyline.jpg",
  },
  {
    id: "shanghai",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Pudong_Shanghai_November_2017_panorama.jpg/1600px-Pudong_Shanghai_November_2017_panorama.jpg",
  },
  {
    id: "new-york",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu.jpg/1600px-View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu.jpg",
  },
  {
    id: "los-angeles",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Los_Angeles_skyline_at_night.jpg/1600px-Los_Angeles_skyline_at_night.jpg",
  },
  {
    id: "philadelphia",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Philadelphia_skyline_from_South_Street_Bridge_July_2016.jpg/1600px-Philadelphia_skyline_from_South_Street_Bridge_July_2016.jpg",
  },
  {
    id: "default",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Madison_Square_Garden_2021.jpg/1600px-Madison_Square_Garden_2021.jpg",
  },
];

const UA = "FightScopeAssetBot/1.0 (local fetch; +https://fightscope.app)";

async function main() {
  for (const asset of ASSETS) {
    const out = path.join(DEST, `${asset.id}.jpg`);
    process.stdout.write(`Fetching ${asset.id}… `);
    try {
      const res = await fetch(asset.url, {
        headers: { "User-Agent": UA, Accept: "image/*" },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 20_000) throw new Error(`too small (${buf.length})`);
      writeFileSync(out, buf);
      console.log(`ok (${buf.length} bytes) → ${out}`);
    } catch (err) {
      console.log(`FAIL: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log("Done. Update event-backgrounds.ts extensions to .jpg if replacing PNGs.");
}

main();
