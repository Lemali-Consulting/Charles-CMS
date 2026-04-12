import { NextResponse } from "next/server";
import { getMonthlyInteractionStats, getCurrentMonthInteractionStats, getMonthlyIntroStatsByCategory } from "@/lib/db";

export async function GET() {
  const monthly = getMonthlyInteractionStats();
  const current = getCurrentMonthInteractionStats();
  const by_category = getMonthlyIntroStatsByCategory();
  return NextResponse.json({ monthly, current, by_category });
}
