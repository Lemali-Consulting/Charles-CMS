import { NextRequest, NextResponse } from "next/server";
import { getInteractionMediums, createInteractionMedium } from "@/lib/db";
import { parseJson } from "@/lib/parse-json";

export async function GET() {
  return NextResponse.json(getInteractionMediums());
}

export async function POST(request: NextRequest) {
  const parsed = await parseJson<{ name?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const { name } = parsed.data;
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    return NextResponse.json(createInteractionMedium(name), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Medium already exists" }, { status: 409 });
  }
}
