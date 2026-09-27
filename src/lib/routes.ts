export const routes = {
  landing: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  app: "/app",
  events: "/app/events",
  event: (slug: string) => `/app/events/${slug}`,
  fighters: "/app/fighters",
  fighter: (slug: string) => `/app/fighters/${slug}`,
  fight: (slug: string) => `/app/fight/${slug}`,
  compare: "/app/compare",
  history: "/app/history",
  historyItem: (id: string) => `/app/history/${id}`,
  pricing: "/app/pricing",
  account: "/app/account",
} as const;

export function compareHref(a?: string | null, b?: string | null): string {
  const params = new URLSearchParams();
  if (a) params.set("a", a);
  if (b) params.set("b", b);
  const query = params.toString();
  return query ? `${routes.compare}?${query}` : routes.compare;
}

export function signInHref(next?: string | null): string {
  if (!next || next === routes.app) return routes.signIn;
  const params = new URLSearchParams({ next });
  return `${routes.signIn}?${params.toString()}`;
}
