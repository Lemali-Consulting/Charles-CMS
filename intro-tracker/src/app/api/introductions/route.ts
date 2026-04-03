import { NextRequest, NextResponse } from "next/server";
import {
  createIntroduction,
  getIntroductions,
  deleteIntroduction,
} from "@/lib/db";

const VALID_TYPES = ["founder", "investor", "talent", "customer"];

export async function GET() {
  const introductions = getIntroductions();
  return NextResponse.json(introductions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { date, founder_name, contact_name, contact_types, industry, company, university, notes } = body;

  if (!date || !founder_name || !contact_name || !contact_types) {
    return NextResponse.json(
      { error: "Missing required fields: date, founder_name, contact_name, contact_types" },
      { status: 400 }
    );
  }

  if (!Array.isArray(contact_types) || contact_types.length === 0) {
    return NextResponse.json(
      { error: "contact_types must be a non-empty array" },
      { status: 400 }
    );
  }

  if (!contact_types.every((t: string) => VALID_TYPES.includes(t))) {
    return NextResponse.json(
      { error: `Each contact_type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const introduction = createIntroduction({
    date,
    founder_name,
    contact_name,
    contact_types,
    industry,
    company,
    university,
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
