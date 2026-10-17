import type { CSSProperties } from "react";

/** Named palette keys → CSS custom properties in globals.css */
export const AISLE_PALETTE = [
  { id: "gront", label: "Grøn" },
  { id: "torvare", label: "Høstgul" },
  { id: "hygiejne", label: "Grå" },
  { id: "maelke", label: "Gul" },
  { id: "animal", label: "Rød" },
  { id: "drikke", label: "Lyserød" },
  { id: "husholdning", label: "Lyseblå" },
  { id: "orange", label: "Orange" },
  { id: "lilla", label: "Lilla" },
  { id: "teal", label: "Turkis" },
  { id: "default", label: "Neutral" },
] as const;

export type AisleColorId = (typeof AISLE_PALETTE)[number]["id"];

const PALETTE_IDS = new Set<string>(AISLE_PALETTE.map((c) => c.id));

/** Default color for known seed aisle names. */
export const DEFAULT_AISLE_COLORS: Record<string, AisleColorId> = {
  Grønt: "gront",
  Tørvare: "torvare",
  Hygiejne: "hygiejne",
  Mælkeprodukter: "maelke",
  Animal: "animal",
  "Drikkevare/Snacks": "drikke",
  Husholdning: "husholdning",
  Vin: "drikke",
  "Kød/fisk": "animal",
  "Kød/Fisk": "animal",
};

export function isAisleColorId(value: string): value is AisleColorId {
  return PALETTE_IDS.has(value);
}

export function normalizeAisleColor(value: string | null | undefined): AisleColorId {
  if (value && isAisleColorId(value)) return value;
  return "default";
}

export function defaultColorForAisleName(name: string): AisleColorId {
  return DEFAULT_AISLE_COLORS[name] ?? "default";
}

/** Inline styles for a row tinted by palette color id. */
export function aisleColorStyle(color: string): CSSProperties {
  const key = normalizeAisleColor(color);
  return {
    backgroundColor: `var(--aisle-${key}-bg)`,
    borderColor: `var(--aisle-${key}-border)`,
    color: `var(--aisle-${key}-fg)`,
  };
}
