import type { Config } from "@netlify/functions";
import { invokeSiteJob } from "./_invoke-job";

/** Daily 03:00 UTC — refresh upcoming events scoreboard. */
export default async () => invokeSiteJob("upcoming-events");

export const config: Config = {
  schedule: "0 3 * * *",
};
