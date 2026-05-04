import { NextRequest, NextResponse } from "next/server";
import { getPersonPersonRelationships, createPersonPersonRelationship, deletePersonPersonRelationship } from "@/lib/db";
import { parseJson } from "@/lib/parse-json";

export async function GET() {
  return NextResponse.json(getPersonPersonRelationships());
}

export async function POST(request: NextRequest) {
  const parsed = await parseJson<{ person_1_id?: number; person_2_id?: number; relationship_type_id?: number; notes?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (!data.person_1_id || !data.person_2_id) {
    return NextResponse.json({ error: "person_1_id and person_2_id are required" }, { status: 400 });
  }
  if (data.person_1_id === data.person_2_id) {
    return NextResponse.json({ error: "Cannot create a relationship with the same person" }, { status: 400 });
  }
  try {
    return NextResponse.json(createPersonPersonRelationship({
      person_1_id: data.person_1_id,
      person_2_id: data.person_2_id,
      relationship_type_id: data.relationship_type_id,
      notes: data.notes,
    }), { status: 201 });
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
  const deleted = deletePersonPersonRelationship(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
