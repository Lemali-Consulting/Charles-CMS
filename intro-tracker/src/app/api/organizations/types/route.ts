import { NextRequest, NextResponse } from "next/server";
import { getOrgTypes, createOrgType } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getOrgTypes());
}

export async function POST(request: NextRequest) {
  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    return NextResponse.json(createOrgType(name), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Type already exists" }, { status: 409 });
  }
}
