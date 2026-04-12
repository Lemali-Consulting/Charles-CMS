import { NextRequest, NextResponse } from "next/server";
import { getPerson, updatePerson, setPersonTags } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = getPerson(Number(id));
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(person);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await request.json();
  if (data.tags !== undefined) {
    setPersonTags(Number(id), data.tags);
    delete data.tags;
  }
  const person = updatePerson(Number(id), data);
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(person);
}
