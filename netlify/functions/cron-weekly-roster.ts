import type { Config } from "@netlify/functions";
import { invokeSiteJob } from "./_invoke-job";

/** Weekly Sunday 04:00 UTC — broader roster refresh. */
export default async () => invokeSiteJob("weekly-roster");

export const config: Config = {
  schedule: "0 4 * * 0",
};
