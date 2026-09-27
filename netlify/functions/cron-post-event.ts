import type { Config } from "@netlify/functions";
import { invokeSiteJob } from "./_invoke-job";

/** Every 6 hours — post-event results + invalidation window. */
export default async () => invokeSiteJob("post-event");

export const config: Config = {
  schedule: "30 */6 * * *",
};
