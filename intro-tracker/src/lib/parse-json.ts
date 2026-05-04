import { NextRequest, NextResponse } from "next/server";

export type JsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJson<T = Record<string, unknown>>(
  request: NextRequest
): Promise<JsonResult<T>> {
  try {
    return { ok: true, data: (await request.json()) as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid or empty JSON body" },
        { status: 400 }
      ),
    };
  }
}
