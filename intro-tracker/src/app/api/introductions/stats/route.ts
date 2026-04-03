import { NextResponse } from "next/server";
import { getMonthlyStats, getCurrentMonthStats, getTagBreakdown } from "@/lib/db";

export async function GET() {
  const monthly = getMonthlyStats();
  const currentMonth = getCurrentMonthStats();
  const tagBreakdown = getTagBreakdown();

  return NextResponse.json({
    monthly,
    currentMonth,
    tagBreakdown,
  });
}
