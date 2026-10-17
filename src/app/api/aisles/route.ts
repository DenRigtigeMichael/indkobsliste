import { NextResponse } from "next/server";
import { createAisle, listAisles } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ aisles: listAisles() });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunne ikke hente afdelinger." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      color?: string;
    };
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Kategorinavn mangler." },
        { status: 400 },
      );
    }
    const aisle = createAisle(body.name, body.color);
    return NextResponse.json({ aisle, aisles: listAisles() }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Kunne ikke oprette kategori.";
    const status = message.includes("allerede") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
