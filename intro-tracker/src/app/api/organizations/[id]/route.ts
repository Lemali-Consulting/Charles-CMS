import { NextRequest, NextResponse } from "next/server";
import { getOrganization, updateOrganization } from "@/lib/db";
import { parseJson } from "@/lib/parse-json";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = getOrganization(Number(id));
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(org);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request);
  if (!parsed.ok) return parsed.response;
  const org = updateOrganization(Number(id), parsed.data);
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(org);
}
