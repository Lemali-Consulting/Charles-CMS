import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || "";

export const COOKIE_NAME = "charles-session";
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function verifyPassword(plain: string): Promise<boolean> {
  if (!AUTH_PASSWORD_HASH) return false;
  return bcrypt.compare(plain, AUTH_PASSWORD_HASH);
}

export function createSessionToken(): string {
  return jwt.sign({}, SESSION_SECRET, { expiresIn: "30d" });
}

export function verifySessionToken(token: string): boolean {
  try {
    jwt.verify(token, SESSION_SECRET);
    return true;
  } catch {
    return false;
  }
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}
