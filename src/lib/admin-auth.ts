import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "indkobsliste_admin";
const SESSION_MESSAGE = "indkobsliste.admin.session.v1";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const MAX_PASSWORD_LENGTH = 256;
const MAX_TOKEN_LENGTH = 128;

function readAdminPasswordRaw(): string | undefined {
  // Dynamic lookup so Next does not inline the value at build time.
  const env = process.env;
  return env.ADMIN_PASSWORD;
}

/** Trimmed password, or null when admin is disabled. */
export function adminPassword(): string | null {
  const raw = readAdminPasswordRaw();
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function isAdminEnabled(): boolean {
  return adminPassword() !== null;
}

function safeEqualString(left: string, right: string): boolean {
  const a = createHash("sha256").update(left, "utf8").digest();
  const b = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function checkAdminPassword(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  if (input.length === 0 || input.length > MAX_PASSWORD_LENGTH) return false;
  return safeEqualString(input, expected);
}

/** HMAC of a fixed message, keyed by the password, so a password change invalidates sessions. */
export function adminSessionToken(): string | null {
  const password = adminPassword();
  if (!password) return null;
  return createHmac("sha256", password).update(SESSION_MESSAGE).digest("base64url");
}

export function isValidAdminSession(token: string | undefined | null): boolean {
  if (!token || token.length > MAX_TOKEN_LENGTH) return false;
  const expected = adminSessionToken();
  if (!expected) return false;
  return safeEqualString(token, expected);
}

export function adminCookieOptions(secure: boolean): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

export function requestIsHttps(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim().toLowerCase();
    return first === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}
