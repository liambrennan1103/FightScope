import { NextResponse } from "next/server";
import { type JobName, runScheduledJob } from "@/server/jobs/scheduled";

export const runtime = "nodejs";
export const maxDuration = 300;

const JOBS = new Set<JobName>([
  "upcoming-events",
  "weekly-roster",
  "upcoming-fighters",
  "near-7d",
  "near-24h",
  "post-event",
  "precompute",
  "stale-sweep",
]);

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = new URL(request.url).searchParams.get("secret") ?? "";
  return bearer === secret || query === secret;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { job?: string };
    const job = body.job as JobName | undefined;
    if (!job || !JOBS.has(job)) {
      return NextResponse.json({ error: "Unknown job", jobs: [...JOBS] }, { status: 400 });
    }
    const result = await runScheduledJob(job, `http:${job}`);
    return NextResponse.json({ ok: true, job, result });
  } catch (error) {
    console.error("Scheduled job failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Job failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = new URL(request.url).searchParams.get("job") as JobName | null;
  if (!job || !JOBS.has(job)) {
    return NextResponse.json({ error: "Unknown job", jobs: [...JOBS] }, { status: 400 });
  }
  try {
    const result = await runScheduledJob(job, `http-get:${job}`);
    return NextResponse.json({ ok: true, job, result });
  } catch (error) {
    console.error("Scheduled job failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Job failed" },
      { status: 500 },
    );
  }
}
