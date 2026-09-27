import { compare, hash } from "./password";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

const USERS_PATH = path.join(process.cwd(), ".data", "users.json");

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await readFile(USERS_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]) {
  await mkdir(path.dirname(USERS_PATH), { recursive: true });
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const users = await readUsers();
  return users.find((user) => user.email === normalizeEmail(email));
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<StoredUser> {
  const email = normalizeEmail(input.email);
  const users = await readUsers();
  if (users.some((user) => user.email === email)) {
    throw new Error("An account with that email already exists.");
  }
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    name: input.name?.trim() || email.split("@")[0] || "Fighter",
    passwordHash: hash(input.password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return user;
}

export async function authenticateUser(email: string, password: string): Promise<StoredUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  if (!compare(password, user.passwordHash)) return null;
  return user;
}
