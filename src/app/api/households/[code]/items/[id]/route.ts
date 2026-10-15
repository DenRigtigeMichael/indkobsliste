import { NextResponse } from "next/server";
import { normalizeAisle } from "@/lib/aisles";
import {
  deleteItem,
  moveItemWithinAisle,
  setItemChecked,
  updateItemDetails,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string; id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { code, id } = await params;
    const body = (await request.json()) as {
      checked?: boolean;
      aisle?: string;
      name?: string;
      move?: "up" | "down";
    };

    if (body.move === "up" || body.move === "down") {
      const household = moveItemWithinAisle(code, id, body.move);
      if (!household) {
        return NextResponse.json(
          { error: "Varen eller husstanden findes ikke." },
          { status: 404 },
        );
      }
      return NextResponse.json(household);
    }

    if (typeof body.name === "string" || typeof body.aisle === "string") {
      const aisleNorm =
        typeof body.aisle === "string" ? normalizeAisle(body.aisle) : undefined;
      if (typeof body.aisle === "string" && !aisleNorm) {
        return NextResponse.json(
          { error: "Vælg en gyldig afdeling." },
          { status: 400 },
        );
      }
      const item = updateItemDetails(code, id, {
        name: body.name,
        aisle: aisleNorm ?? undefined,
      });
      if (!item) {
        return NextResponse.json(
          { error: "Varen eller husstanden findes ikke." },
          { status: 404 },
        );
      }
      return NextResponse.json(item);
    }

    if (typeof body.checked === "boolean") {
      const item = setItemChecked(code, id, body.checked);
      if (!item) {
        return NextResponse.json(
          { error: "Varen eller husstanden findes ikke." },
          { status: 404 },
        );
      }
      return NextResponse.json(item);
    }

    return NextResponse.json(
      { error: "Ingen gyldig ændring angivet." },
      { status: 400 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunne ikke opdatere varen. Prøv igen." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { code, id } = await params;
    const deleted = deleteItem(code, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Varen eller husstanden findes ikke." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunne ikke slette varen. Prøv igen." },
      { status: 500 },
    );
  }
}
