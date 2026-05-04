import { NextRequest, NextResponse } from "next/server";
import { getInteraction, updateInteraction } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const interaction = getInteraction(Number(id));
  if (!interaction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(interaction);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await request.json();
  const interaction = updateInteraction(Number(id), data);
  if (!interaction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(interaction);
}
