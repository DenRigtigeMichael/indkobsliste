"use client";

import type { AisleDef, Item } from "@/lib/types";
import { aisleColorStyle } from "@/lib/aisle-colors";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  items: Item[];
  aisles: AisleDef[];
  pendingIds: Set<string>;
  onToggle: (item: Item, checked: boolean) => void;
};

/**
 * «Dagens køb» — currently checked items only.
 * Layout: name left · checkbox center · aisle right.
 * Unchecking removes the row immediately; item stays on aisle list.
 */
export function DagensKoeb({ items, aisles, pendingIds, onToggle }: Props) {
  const checked = items.filter((item) => item.checked);
  if (checked.length === 0) return null;

  const colorByName = new Map(aisles.map((a) => [a.name, a.color]));

  return (
    <section
      className="rise-in mb-6"
      aria-labelledby="dagens-koeb-heading"
    >
      <h2
        id="dagens-koeb-heading"
        className="font-heading mb-2 text-lg font-semibold text-pine"
      >
        Dagens køb
      </h2>
      <ul className="space-y-1.5">
        {checked.map((item) => {
          const busy = pendingIds.has(item.id);
          const color = colorByName.get(item.aisle) ?? "default";
          return (
            <li key={item.id}>
              <div
                className="grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border px-2.5"
                style={aisleColorStyle(color)}
              >
                <span className="min-w-0 truncate text-left text-sm font-medium">
                  {item.name}
                </span>
                <Checkbox
                  checked
                  disabled={busy}
                  className="justify-self-center"
                  onCheckedChange={(value) => {
                    if (value !== true) onToggle(item, false);
                  }}
                  aria-label={`Fjern afkrydsning for ${item.name}`}
                />
                <span className="min-w-0 truncate text-right text-[11px] font-medium tracking-wide opacity-70">
                  {item.aisle}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
