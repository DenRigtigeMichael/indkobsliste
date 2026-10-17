import { NextResponse } from "next/server";
import { listAisles, updateAisle } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      color?: string;
    };
    const aisle = updateAisle(id, {
      name: body.name,
      color: body.color,
    });
    return NextResponse.json({ aisle, aisles: listAisles() });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Kunne ikke opdatere kategori.";
    const status = message.includes("ikke")
      ? 404
      : message.includes("allerede")
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
