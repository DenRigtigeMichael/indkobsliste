import { NextResponse } from "next/server";
import { createHousehold } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const household = createHousehold();
    return NextResponse.json(household, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunne ikke oprette husstand. Prøv igen." },
      { status: 500 },
    );
  }
}
