import { NextRequest, NextResponse } from "next/server";
import { getOrgPersonRelationships, createOrgPersonRelationship, deleteOrgPersonRelationship } from "@/lib/db";
import { parseJson } from "@/lib/parse-json";

export async function GET() {
  return NextResponse.json(getOrgPersonRelationships());
}

export async function POST(request: NextRequest) {
  const parsed = await parseJson<{ organization_id?: number; person_id?: number; relationship_type_id?: number; notes?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (!data.organization_id || !data.person_id) {
    return NextResponse.json({ error: "organization_id and person_id are required" }, { status: 400 });
  }
  try {
    return NextResponse.json(createOrgPersonRelationship({
      organization_id: data.organization_id,
      person_id: data.person_id,
      relationship_type_id: data.relationship_type_id,
      notes: data.notes,
    }), { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const deleted = deleteOrgPersonRelationship(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
