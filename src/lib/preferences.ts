export type Locale = "da" | "en";
export type Handedness = "left" | "right";

const LOCALE_KEY = "indkobsliste.locale";
const HAND_KEY = "indkobsliste.handedness";

/** Hostnames that should default to English (future English domain). */
const ENGLISH_HOST_RE =
  /(^|\.)(grocerylist|grocery-list|shoppinglist)\b/i;

export function defaultLocaleFromHostname(hostname: string): Locale {
  const host = hostname.toLowerCase();
  if (ENGLISH_HOST_RE.test(host)) {
    return "en";
  }
  // indkoebsliste.dk, railway.app, localhost → Danish
  return "da";
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(LOCALE_KEY);
    if (value === "da" || value === "en") return value;
  } catch {
    // ignore
  }
  return null;
}

export function writeStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore
  }
}

export function resolveLocale(): Locale {
  const stored = readStoredLocale();
  if (stored) return stored;
  if (typeof window === "undefined") return "da";
  return defaultLocaleFromHostname(window.location.hostname);
}

export function readStoredHandedness(): Handedness {
  if (typeof window === "undefined") return "right";
  try {
    const value = window.localStorage.getItem(HAND_KEY);
    if (value === "left" || value === "right") return value;
  } catch {
    // ignore
  }
  return "right";
}

export function writeStoredHandedness(hand: Handedness): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HAND_KEY, hand);
  } catch {
    // ignore
  }
}
