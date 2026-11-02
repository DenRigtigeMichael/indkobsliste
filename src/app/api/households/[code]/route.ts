import { NextResponse } from "next/server";
import { getHousehold, noteHouseholdSeen } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const household = getHousehold(code);
    if (!household) {
      return NextResponse.json(
        { error: "Husstanden findes ikke. Tjek koden og prøv igen." },
        { status: 404 },
      );
    }
    try {
      noteHouseholdSeen(household.code);
    } catch (seenError) {
      console.error(seenError);
    }
    return NextResponse.json(household);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunne ikke hente listen. Prøv igen om et øjeblik." },
      { status: 500 },
    );
  }
}
