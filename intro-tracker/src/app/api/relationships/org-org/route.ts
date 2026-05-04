import { NextRequest, NextResponse } from "next/server";
import { getOrgOrgRelationships, createOrgOrgRelationship, deleteOrgOrgRelationship } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getOrgOrgRelationships());
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  if (!data.org_1_id || !data.org_2_id) {
    return NextResponse.json({ error: "org_1_id and org_2_id are required" }, { status: 400 });
  }
  if (data.org_1_id === data.org_2_id) {
    return NextResponse.json({ error: "Cannot create a relationship with the same organization" }, { status: 400 });
  }
  try {
    return NextResponse.json(createOrgOrgRelationship(data), { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "This relationship already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const deleted = deleteOrgOrgRelationship(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
