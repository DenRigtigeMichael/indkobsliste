import fs from "node:fs";
import path from "node:path";
import { defaultColorForAisleName } from "./aisle-colors";
import type { AisleDef } from "./types";

export type { AisleDef };

/** Default if `kategorier.ini` is missing or empty. */
export const DEFAULT_AISLES = [
  "Grønt",
  "Tørvare",
  "Hygiejne",
  "Mælkeprodukter",
  "Animal",
  "Drikkevare/Snacks",
  "Husholdning",
] as const;

/** Legacy aisle labels still present in older SQLite rows. */
export const LEGACY_AISLE_MAP: Record<string, string> = {
  Vin: "Drikkevare/Snacks",
  "Kød/fisk": "Animal",
  "Kød/Fisk": "Animal",
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

    const numbered = withoutComment.match(/^\d+\s*=\s*(.+)$/);
    const name = (numbered ? numbered[1]! : withoutComment).trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    aisles.push(name);
  }

  return aisles;
}

/** Names from `kategorier.ini` (or built-in defaults) — used to seed SQLite. */
export function getSeedAisleNames(): string[] {
  try {
    const text = fs.readFileSync(configPath(), "utf8");
    const aisles = parseAisleLines(text);
    if (aisles.length > 0) return aisles;
  } catch {
    // missing/unreadable → defaults
  }
  return [...DEFAULT_AISLES];
}

/** Seed defs with default palette colors. */
export function getSeedAisleDefs(): Omit<AisleDef, "id">[] {
  return getSeedAisleNames().map((name, index) => ({
    name,
    color: defaultColorForAisleName(name),
    sortOrder: index,
  }));
}
