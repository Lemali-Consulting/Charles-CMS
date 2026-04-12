import { NextRequest, NextResponse } from "next/server";
import { getOrgPersonRelationshipTypes, createOrgPersonRelationshipType } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getOrgPersonRelationshipTypes());
}

export async function POST(request: NextRequest) {
  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    return NextResponse.json(createOrgPersonRelationshipType(name), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Type already exists" }, { status: 409 });
  }
}
