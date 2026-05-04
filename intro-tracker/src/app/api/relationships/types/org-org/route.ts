import { NextRequest, NextResponse } from "next/server";
import { getOrgOrgRelationshipTypes, createOrgOrgRelationshipType } from "@/lib/db";
import { parseJson } from "@/lib/parse-json";

export async function GET() {
  return NextResponse.json(getOrgOrgRelationshipTypes());
}

export async function POST(request: NextRequest) {
  const parsed = await parseJson<{ name?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const { name } = parsed.data;
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    return NextResponse.json(createOrgOrgRelationshipType(name), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Type already exists" }, { status: 409 });
  }
}
