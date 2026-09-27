import type { Config } from "@netlify/functions";
import { invokeSiteJob } from "./_invoke-job";

/** Every 2 hours — events/fights within 24 hours. */
export default async () => invokeSiteJob("near-24h");

export const config: Config = {
  schedule: "20 */2 * * *",
};
