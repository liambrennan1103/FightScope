import type { Config } from "@netlify/functions";
import { invokeSiteJob } from "./_invoke-job";

/** Every 6 hours — events/fights within 7 days. */
export default async () => invokeSiteJob("near-7d");

export const config: Config = {
  schedule: "0 */6 * * *",
};
