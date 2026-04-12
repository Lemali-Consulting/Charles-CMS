import { NextResponse } from "next/server";
import { getAllPersonTags } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getAllPersonTags());
}
