/**
 * Shared helper for Netlify scheduled functions:
 * authenticate and invoke the Next.js job runner.
 */
export async function invokeSiteJob(job: string) {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.SITE_URL;
  const secret = process.env["CRON_SECRET"];
  if (!siteUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "URL / DEPLOY_PRIME_URL not set" }),
    };
  }
  if (!secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "CRON_SECRET not set" }),
    };
  }

  const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/jobs/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ job }),
  });

  const text = await response.text();
  return {
    statusCode: response.status,
    body: text,
  };
}
