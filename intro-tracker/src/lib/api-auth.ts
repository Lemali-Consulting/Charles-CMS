import { isEmailAllowed } from "./allowlist";
import { checkRateLimit } from "./rate-limit";

type SessionLike = { user?: { email?: string | null } } | null | undefined;

export type GuardResult =
  | { ok: true; email: string }
  | { ok: false; status: 401 | 403 | 429; message: string };

export function guardApiRequest(opts: {
  session: SessionLike;
  allowlist: string[];
  rateLimitKey: string;
  rateLimit?: { max: number };
}): GuardResult {
  const email = opts.session?.user?.email?.trim().toLowerCase();
  if (!email) return { ok: false, status: 401, message: "Unauthorized" };
  if (!isEmailAllowed(email, opts.allowlist)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  const allowed = checkRateLimit(opts.rateLimitKey, opts.rateLimit?.max);
  if (!allowed) return { ok: false, status: 429, message: "Rate limit exceeded" };
  return { ok: true, email };
}
