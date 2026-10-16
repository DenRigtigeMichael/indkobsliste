/** Persisted so iOS home-screen (manifest start_url `/`) reopens the last list. */
export const LAST_HOUSEHOLD_KEY = "indkobsliste:lastHousehold";

/** Older key used before the PWA redirect fix — migrated on read. */
const LEGACY_KEY = "indkobsliste-code";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function getLastHousehold(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const current = localStorage.getItem(LAST_HOUSEHOLD_KEY);
    if (current?.trim()) return normalizeCode(current);

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy?.trim()) {
      const normalized = normalizeCode(legacy);
      localStorage.setItem(LAST_HOUSEHOLD_KEY, normalized);
      return normalized;
    }
  } catch {
    // private mode / blocked storage
  }
  return null;
}

export function setLastHousehold(code: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeCode(code);
  if (!normalized) return;
  try {
    localStorage.setItem(LAST_HOUSEHOLD_KEY, normalized);
    // Keep legacy key in sync for any older clients
    localStorage.setItem(LEGACY_KEY, normalized);
  } catch {
    // ignore
  }
}

export function clearLastHousehold(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_HOUSEHOLD_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}
