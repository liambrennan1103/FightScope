import "server-only";

/**
 * Read a server env var by dynamic key so Next.js cannot statically inline
 * the value into build output (which trips Netlify secrets scanning).
 *
 * Only use for non-NEXT_PUBLIC secrets. Never call from client modules.
 */
export function readServerEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readServerEnvOr(
  names: string[],
): string | undefined {
  for (const name of names) {
    const value = readServerEnv(name);
    if (value) return value;
  }
  return undefined;
}
