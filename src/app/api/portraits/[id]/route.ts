import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cacheEspnHeadshot, portraitsDir } from "@/server/mma/portrait-pipeline";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = path.join(portraitsDir(), `${id}.png`);
  if (!existsSync(file)) {
    const result = await cacheEspnHeadshot(id);
    if (result.status !== "approved" || !existsSync(file)) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const body = readFileSync(file);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
