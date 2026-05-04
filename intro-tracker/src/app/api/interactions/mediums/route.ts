import { NextRequest, NextResponse } from "next/server";
import { getInteractionMediums, createInteractionMedium } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getInteractionMediums());
}

export async function POST(request: NextRequest) {
  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    return NextResponse.json(createInteractionMedium(name), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Medium already exists" }, { status: 409 });
  }
}
