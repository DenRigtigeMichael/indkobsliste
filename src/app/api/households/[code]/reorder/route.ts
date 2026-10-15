import { NextResponse } from "next/server";
import { normalizeAisle } from "@/lib/aisles";
import { reorderAisleItems } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const body = (await request.json()) as {
      aisle?: string;
      orderedIds?: string[];
    };

    const aisleNorm = body.aisle ? normalizeAisle(body.aisle) : null;
    if (!aisleNorm) {
      return NextResponse.json(
        { error: "Vælg en gyldig afdeling." },
        { status: 400 },
      );
    }
    if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
      return NextResponse.json(
        { error: "Mangler ny rækkefølge." },
        { status: 400 },
      );
    }
    if (body.orderedIds.some((id) => typeof id !== "string" || !id)) {
      return NextResponse.json(
        { error: "Ugyldig rækkefølge." },
        { status: 400 },
      );
    }

    const household = reorderAisleItems(code, aisleNorm, body.orderedIds);
    if (!household) {
      return NextResponse.json(
        { error: "Husstanden findes ikke. Tjek koden og prøv igen." },
        { status: 404 },
      );
    }
    return NextResponse.json(household);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kunne ikke ændre rækkefølgen.";
    console.error(error);
    const status = message.includes("Ugyldig") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
