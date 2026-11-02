import { connection } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  adminSessionToken,
  checkAdminPassword,
  isAdminEnabled,
  requestIsHttps,
} from "@/lib/admin-auth";
import { adminJson } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 20;
const failureTimes: number[] = [];

function rateLimited(now: number): boolean {
  while (failureTimes.length > 0 && now - failureTimes[0]! > FAILURE_WINDOW_MS) {
    failureTimes.shift();
  }
  return failureTimes.length >= MAX_FAILURES;
}

export async function POST(request: Request) {
  await connection();
  if (!isAdminEnabled()) {
    return adminJson({ error: "Not found" }, 404);
  }
  if (rateLimited(Date.now())) {
    return adminJson({ error: "Too many attempts" }, 429);
  }

  let password = "";
  try {
    const body = (await request.json()) as unknown;
    if (
      body &&
      typeof body === "object" &&
      "password" in body &&
      typeof (body as { password: unknown }).password === "string"
    ) {
      password = (body as { password: string }).password;
    }
  } catch {
    return adminJson({ error: "Bad request" }, 400);
  }

  if (!checkAdminPassword(password)) {
    failureTimes.push(Date.now());
    await new Promise((resolve) => setTimeout(resolve, 400));
    return adminJson({ error: "Unauthorized" }, 401);
  }

  const token = adminSessionToken();
  if (!token) {
    return adminJson({ error: "Not found" }, 404);
  }

  const response = adminJson({ ok: true });
  response.cookies.set(
    ADMIN_COOKIE,
    token,
    adminCookieOptions(requestIsHttps(request)),
  );
  return response;
}
