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
  const parsed = await parseJson<{
    categories?: string[];
    first_name?: string;
    last_name?: string;
    email?: string;
    linkedin_url?: string;
    notes?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const { categories, ...data } = parsed.data;
  if (categories !== undefined) {
    setPersonCategories(Number(id), categories);
  }
  const person = updatePerson(Number(id), data);
  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(person);
}
