export function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function isEmailAllowed(email: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return allowlist.some((entry) => entry.trim().toLowerCase() === normalized);
}
