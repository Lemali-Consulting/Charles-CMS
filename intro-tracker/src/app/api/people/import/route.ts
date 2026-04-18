import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseAllowlist } from "@/lib/allowlist";
import { guardApiRequest } from "@/lib/api-auth";
import { createPerson, findPersonByEmail } from "@/lib/db";

type ImportRow = {
  email?: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
};

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
  }

  const session = await auth();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const guard = guardApiRequest({
    session,
    allowlist: parseAllowlist(process.env.AUTH_ALLOWED_EMAILS),
    rateLimitKey: `people-import:${ip}`,
    rateLimit: { max: 3 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an array of people" }, { status: 400 });
  }
  const rows = body as ImportRow[];

  let inserted = 0;
  let skippedDuplicate = 0;
  let skippedInvalid = 0;
  const errors: { index: number; email?: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const first = r.first_name?.trim() ?? "";
    const last = r.last_name?.trim() ?? "";
    const email = r.email?.trim().toLowerCase() ?? "";
    if (!first && !last) {
      skippedInvalid++;
      continue;
    }
    if (email && findPersonByEmail(email)) {
      skippedDuplicate++;
      continue;
    }
    try {
      createPerson({
        first_name: first || "(unknown)",
        last_name: last || "(unknown)",
        email,
        notes: r.notes ?? "",
      });
      inserted++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE")) {
        skippedDuplicate++;
      } else {
        errors.push({ index: i, email, error: msg });
      }
    }
  }

  return NextResponse.json({
    inserted,
    skipped_duplicate: skippedDuplicate,
    skipped_invalid: skippedInvalid,
    errors,
    total: rows.length,
  });
}
