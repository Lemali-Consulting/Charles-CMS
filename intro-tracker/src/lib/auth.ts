import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "charles-session";
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function verifyPassword(plain: string): Promise<boolean> {
  const hash = process.env.AUTH_PASSWORD_HASH || "";
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function createSessionToken(): string {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  return jwt.sign({}, secret, { expiresIn: "30d" });
}

export function verifySessionToken(token: string): boolean {
  try {
    const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
    jwt.verify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}
