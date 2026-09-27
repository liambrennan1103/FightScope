import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function compare(password: string, stored: string): boolean {
  const [scheme, salt, derived] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !derived) return false;
  const next = scryptSync(password, salt, KEY_LENGTH);
  const prev = Buffer.from(derived, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}
