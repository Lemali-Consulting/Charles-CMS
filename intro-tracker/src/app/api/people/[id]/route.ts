import { NextRequest, NextResponse } from "next/server";
import { getPerson, updatePerson, setPersonCategories } from "@/lib/db";
import { parseJson } from "@/lib/parse-json";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = getPerson(Number(id));
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(person);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (data.categories !== undefined) {
    setPersonCategories(Number(id), data.categories);
    delete data.categories;
  }
  const person = updatePerson(Number(id), data);
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(person);
}
