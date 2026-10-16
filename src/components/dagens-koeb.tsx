"use client";

import type { Item } from "@/lib/types";
import { aisleColorStyle } from "@/lib/aisle-colors";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  items: Item[];
  pendingIds: Set<string>;
  onToggle: (item: Item, checked: boolean) => void;
};

/**
 * «Dagens køb» — currently checked items only.
 * Unchecking removes the row from this list immediately (optimistic);
 * the item stays on the aisle list unchecked.
 */
export function DagensKoeb({ items, pendingIds, onToggle }: Props) {
  const checked = items.filter((item) => item.checked);
  if (checked.length === 0) return null;

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
          return (
            <li key={item.id}>
              <div
                className="flex h-11 items-center gap-2 rounded-xl border px-2.5"
                style={aisleColorStyle(item.aisle)}
              >
                <Checkbox
                  checked
                  disabled={busy}
                  onCheckedChange={(value) => {
                    if (value !== true) onToggle(item, false);
                  }}
                  aria-label={`Fjern afkrydsning for ${item.name}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {item.name}
                </span>
                <span className="shrink-0 text-[11px] font-medium tracking-wide opacity-70">
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
