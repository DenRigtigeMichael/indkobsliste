import { NextResponse } from "next/server";
import { addItem, normalizeAisle } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const body = (await request.json()) as {
      name?: string;
      aisle?: string;
    };

    const name = body.name?.trim() ?? "";
    const aisle = body.aisle ?? "";

    if (!name) {
      return NextResponse.json(
        { error: "Skriv et varenavn." },
        { status: 400 },
      );
    }
    const aisleNorm = normalizeAisle(aisle);
    if (!aisleNorm) {
      return NextResponse.json(
        { error: "Vælg en gyldig afdeling." },
        { status: 400 },
      );
    }

    const item = addItem(code, name, aisleNorm);
    if (!item) {
      return NextResponse.json(
        { error: "Husstanden findes ikke. Tjek koden og prøv igen." },
        { status: 404 },
      );
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunne ikke tilføje varen. Prøv igen." },
      { status: 500 },
    );
  }
}
