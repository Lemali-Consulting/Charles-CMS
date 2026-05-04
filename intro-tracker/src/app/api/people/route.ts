import { NextRequest, NextResponse } from "next/server";
import { getPeople, createPerson, deletePerson } from "@/lib/db";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") || undefined;
  return NextResponse.json(getPeople(search));
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  if (!data.first_name || !data.last_name) {
    return NextResponse.json({ error: "first_name and last_name are required" }, { status: 400 });
  }
  try {
    const person = createPerson(data);
    return NextResponse.json(person, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "A person with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const deleted = deletePerson(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
