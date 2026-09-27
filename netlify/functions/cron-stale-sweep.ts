import type { Config } from "@netlify/functions";
import { invokeSiteJob } from "./_invoke-job";

/** Daily 06:00 UTC — precompute official upcoming analyses + stale sweep. */
export default async () => invokeSiteJob("stale-sweep");

export const config: Config = {
  schedule: "0 6 * * *",
};
