import { NextRequest, NextResponse } from "next/server";
import { getInteractions, createIntroduction, deleteInteraction } from "@/lib/db";

export async function GET(request: NextRequest) {
  const person_id = request.nextUrl.searchParams.get("person_id");
  const org_id = request.nextUrl.searchParams.get("org_id");
  const type_id = request.nextUrl.searchParams.get("type_id");
  const category = request.nextUrl.searchParams.get("category");
  const month = request.nextUrl.searchParams.get("month");
  return NextResponse.json(getInteractions({
    person_id: person_id ? Number(person_id) : undefined,
    org_id: org_id ? Number(org_id) : undefined,
    type_id: type_id ? Number(type_id) : undefined,
    category: category || undefined,
    month: month || undefined,
  }));
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  if (!data.person_ids || data.person_ids.length < 2) {
    return NextResponse.json({ error: "At least 2 people are required for an introduction" }, { status: 400 });
  }
  if (!data.date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const introduction = createIntroduction({
    medium_id: data.medium_id,
    date: data.date,
    notes: data.notes,
    person_ids: data.person_ids,
  });
  return NextResponse.json(introduction, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const deleted = deleteInteraction(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
