import { NextResponse } from "next/server";
import { getAisles } from "@/lib/aisles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ aisles: getAisles() });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunne ikke hente afdelinger." },
      { status: 500 },
    );
  }
}
