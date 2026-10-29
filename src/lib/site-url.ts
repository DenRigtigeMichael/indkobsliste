/** Apex hosts that must redirect to www (path-preserving). */
const APEX_TO_WWW: Record<string, string> = {
  "indkoebsliste.dk": "www.indkoebsliste.dk",
  "householdlist.eu": "www.householdlist.eu",
};

export function wwwHostFor(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return APEX_TO_WWW[host] ?? null;
}

/**
 * Origin for share / deep links. Always prefer www so links never hit the
 * apex URL-forward that drops the path (PreserveURI: 0 at the DNS host).
 */
export function canonicalOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    const www = wwwHostFor(url.hostname);
    if (www) url.hostname = www;
    return url.origin;
  } catch {
    return origin;
  }
}

export function householdShareUrl(origin: string, code: string): string {
  const normalized = code.trim().toUpperCase();
  return `${canonicalOrigin(origin)}/h/${encodeURIComponent(normalized)}`;
}

/** True when launched from the installed home-screen / PWA shell. */
export function isHomeScreenLaunch(
  searchParams: { get(name: string): string | null },
  win: Window | null = typeof window !== "undefined" ? window : null,
): boolean {
  if (searchParams.get("source") === "pwa") return true;
  if (!win) return false;

  const nav = win.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;

  try {
    if (win.matchMedia("(display-mode: standalone)").matches) return true;
    if (win.matchMedia("(display-mode: fullscreen)").matches) return true;
  } catch {
    // matchMedia unavailable
  }
  return false;
}
