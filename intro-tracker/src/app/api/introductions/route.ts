import { NextRequest, NextResponse } from "next/server";
import {
  createIntroduction,
  getIntroductions,
  deleteIntroduction,
} from "@/lib/db";

export async function GET() {
  const introductions = getIntroductions();
  return NextResponse.json(introductions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { date, founder_name, contact_name, contact_type, notes } = body;

  if (!date || !founder_name || !contact_name || !contact_type) {
    return NextResponse.json(
      { error: "Missing required fields: date, founder_name, contact_name, contact_type" },
      { status: 400 }
    );
  }

  if (!["investor", "talent", "customer"].includes(contact_type)) {
    return NextResponse.json(
      { error: "contact_type must be one of: investor, talent, customer" },
      { status: 400 }
    );
  }

  const introduction = createIntroduction({
    date,
    founder_name,
    contact_name,
    contact_type,
    notes,
  });

  return NextResponse.json(introduction, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const deleted = deleteIntroduction(Number(id));
  if (!deleted) {
    return NextResponse.json({ error: "Introduction not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
