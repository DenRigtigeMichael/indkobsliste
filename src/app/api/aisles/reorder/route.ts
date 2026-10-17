import { NextResponse } from "next/server";
import { reorderAisles } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { orderedIds?: string[] };
    if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
      return NextResponse.json(
        { error: "Ugyldig rækkefølge." },
        { status: 400 },
      );
    }
    const aisles = reorderAisles(body.orderedIds);
    return NextResponse.json({ aisles });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : "Kunne ikke ændre rækkefølgen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
