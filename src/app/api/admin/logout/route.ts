import { connection } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  isAdminEnabled,
  requestIsHttps,
} from "@/lib/admin-auth";
import { adminJson } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await connection();
  if (!isAdminEnabled()) {
    return adminJson({ error: "Not found" }, 404);
  }
  const response = adminJson({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    ...adminCookieOptions(requestIsHttps(request)),
    maxAge: 0,
  });
  return response;
}
