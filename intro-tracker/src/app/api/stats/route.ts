import { NextResponse } from "next/server";
import { getMonthlyInteractionStats, getCurrentMonthInteractionStats, getInteractionTypes } from "@/lib/db";

export async function GET() {
  const monthly = getMonthlyInteractionStats();
  const current = getCurrentMonthInteractionStats();
  const types = getInteractionTypes();
  return NextResponse.json({ monthly, current, types });
}
