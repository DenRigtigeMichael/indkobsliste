import fs from "node:fs";
import path from "node:path";

/** Default if `kategorier.ini` is missing or empty. */
export const DEFAULT_AISLES = [
  "Grønt",
  "Tørvare",
  "Hygiejne",
  "Mælkeprodukter",
  "Kød/fisk",
  "Drikkevare/Snacks",
  "Husholdning",
] as const;

/** Aisle name from config (editable via kategorier.ini). */
export type Aisle = string;

/** Legacy aisle labels still present in older SQLite rows. */
const LEGACY_AISLE_MAP: Record<string, string> = {
  Vin: "Drikkevare/Snacks",
};

const CONFIG_FILENAME = "kategorier.ini";

function configPath() {
  return path.join(process.cwd(), CONFIG_FILENAME);
}

function parseAisleLines(text: string): string[] {
  const seen = new Set<string>();
  const aisles: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const withoutComment = raw.replace(/#.*$/, "").trim();
    if (!withoutComment) continue;

    // Support "1=Grønt" / "1 = Grønt" as well as plain "Grønt"
    const numbered = withoutComment.match(/^\d+\s*=\s*(.+)$/);
    const name = (numbered ? numbered[1]! : withoutComment).trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    aisles.push(name);
  }

  return aisles;
}

/** Read aisles from project-root `kategorier.ini` (order preserved). */
export function getAisles(): string[] {
  try {
    const text = fs.readFileSync(configPath(), "utf8");
    const aisles = parseAisleLines(text);
    if (aisles.length > 0) return aisles;
  } catch {
    // missing/unreadable → defaults
  }
  return [...DEFAULT_AISLES];
}

export function isAisle(value: string): boolean {
  return getAisles().includes(value);
}

/** Map current + legacy aisle strings (e.g. old `"Vin"`) to a valid aisle. */
export function normalizeAisle(value: string): string | null {
  const aisles = getAisles();
  if (aisles.includes(value)) return value;

  const mapped = LEGACY_AISLE_MAP[value];
  if (mapped) {
    if (aisles.includes(mapped)) return mapped;
    return mapped;
  }

  return null;
}

export function getAisleOrder(): Record<string, number> {
  return Object.fromEntries(getAisles().map((aisle, index) => [aisle, index]));
}

/** Fallback aisle when a row has an unknown label. */
export function defaultAisle(): string {
  return getAisles()[0] ?? "Grønt";
}
