import { cookies } from "next/headers";
import { connection, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  isAdminEnabled,
  isValidAdminSession,
} from "./admin-auth";

export function adminJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** Admin is closed unless ADMIN_PASSWORD is set and the session cookie matches. */
export async function requireAdmin(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  await connection();
  if (!isAdminEnabled()) {
    return { ok: false, response: adminJson({ error: "Not found" }, 404) };
  }
  const jar = await cookies();
  if (!isValidAdminSession(jar.get(ADMIN_COOKIE)?.value)) {
    return { ok: false, response: adminJson({ error: "Unauthorized" }, 401) };
  }
  return { ok: true };
}
