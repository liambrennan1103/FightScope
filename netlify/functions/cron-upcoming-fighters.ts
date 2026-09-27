import type { Config } from "@netlify/functions";
import { invokeSiteJob } from "./_invoke-job";

/** Daily 05:00 UTC — enrich fighters on upcoming cards. */
export default async () => invokeSiteJob("upcoming-fighters");

export const config: Config = {
  schedule: "0 5 * * *",
};
