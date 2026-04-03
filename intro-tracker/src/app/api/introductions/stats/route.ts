import { NextResponse } from "next/server";
import { getMonthlyStats, getCurrentMonthStats } from "@/lib/db";

export async function GET() {
  const monthly = getMonthlyStats();
  const currentMonth = getCurrentMonthStats();

  return NextResponse.json({
    monthly,
    currentMonth,
  });
}
