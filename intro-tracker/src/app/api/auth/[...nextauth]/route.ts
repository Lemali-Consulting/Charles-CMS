import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const pathname = new URL(req.url).pathname;
  if (pathname.includes("/signin/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again in a few minutes." },
        { status: 429 }
      );
    }
  }
  return handlers.POST(req);
}
