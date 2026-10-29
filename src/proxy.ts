import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { wwwHostFor } from "@/lib/site-url";

/**
 * If apex ever reaches the app (e.g. DNS pointed at Railway), keep /h/CODE.
 * Today apex is often URL-forwarded with PreserveURI:0 before Railway — that
 * hosting setting must also preserve the path; this is defense in depth.
 */
export function proxy(request: NextRequest) {
  // Prefer Host header — nextUrl.hostname can be the listen address (127.0.0.1).
  const hostHeader = request.headers.get("host") ?? request.nextUrl.host;
  const hostname = hostHeader.split(":")[0] ?? "";
  const www = wwwHostFor(hostname);
  if (!www) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.hostname = www;
  url.protocol = "https:";
  // Avoid accidental :443 in the redirect Location
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    /*
     * Skip Next internals and common static assets; still cover / and /h/*.
     */
    "/((?!_next/static|_next/image|icons/|manifest\\.webmanifest|.*\\.(?:png|svg|ico|webp|jpg|jpeg|gif)$).*)",
  ],
};
