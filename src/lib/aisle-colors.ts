import type { CSSProperties } from "react";

/** CSS custom-property keys for aisle accent colors (see globals.css). */
const AISLE_COLOR_KEY: Record<string, string> = {
  Grønt: "gront",
  Tørvare: "torvare",
  Hygiejne: "hygiejne",
  Mælkeprodukter: "maelke",
  Animal: "animal",
  "Drikkevare/Snacks": "drikke",
  Husholdning: "husholdning",
  // Legacy labels still seen in older rows
  Vin: "drikke",
  "Kød/fisk": "animal",
  "Kød/Fisk": "animal",
};

export function aisleColorKey(aisle: string): string {
  return AISLE_COLOR_KEY[aisle] ?? "default";
}

/** Inline styles for a row tinted by aisle. */
export function aisleColorStyle(aisle: string): CSSProperties {
  const key = aisleColorKey(aisle);
  return {
    backgroundColor: `var(--aisle-${key}-bg)`,
    borderColor: `var(--aisle-${key}-border)`,
    color: `var(--aisle-${key}-fg)`,
  };
}
