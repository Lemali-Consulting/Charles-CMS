import { NextResponse } from "next/server";
import { getPersonCategories } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getPersonCategories());
}
