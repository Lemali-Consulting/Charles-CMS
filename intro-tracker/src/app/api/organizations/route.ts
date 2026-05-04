import { NextRequest, NextResponse } from "next/server";
import { getOrganizations, createOrganization, deleteOrganization } from "@/lib/db";
import { parseJson } from "@/lib/parse-json";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") || undefined;
  return NextResponse.json(getOrganizations(search));
}

export async function POST(request: NextRequest) {
  const parsed = await parseJson<{ name?: string; org_type_id?: number; notes?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (!data.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const org = createOrganization({ name: data.name, org_type_id: data.org_type_id, notes: data.notes });
    return NextResponse.json(org, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "An organization with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const deleted = deleteOrganization(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
