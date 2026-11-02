import { connection } from "next/server";
import { adminJson, requireAdmin } from "@/lib/admin-guard";
import { getAdminStats } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await connection();
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    return adminJson(getAdminStats());
  } catch (error) {
    console.error(error);
    return adminJson({ error: "Unavailable" }, 500);
  }
}
