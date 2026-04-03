import { NextResponse } from "next/server";
import { getDistinctTags } from "@/lib/db";

export async function GET() {
  const tags = getDistinctTags();
  return NextResponse.json(tags);
}
