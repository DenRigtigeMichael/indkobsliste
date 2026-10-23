"use client";

import type { AisleDef, Item } from "@/lib/types";
import { aisleColorStyle } from "@/lib/aisle-colors";
import { usePrefs, useT } from "@/lib/i18n";

type Props = {
  items: Item[];
  aisles: AisleDef[];
  pendingIds: Set<string>;
  onToggle: (item: Item, checked: boolean) => void;
};

/**
 * «Dagens køb» — currently checked items only.
 * Large Købt/Bought control; side follows Settings handedness.
 * Unchecking removes the row immediately; item stays on aisle list.
 * Names are never struck through.
 */
export function DagensKoeb({ items, aisles, pendingIds, onToggle }: Props) {
  const t = useT();
  const { handedness } = usePrefs();
  const checked = items.filter((item) => item.checked);
  if (checked.length === 0) return null;

  const colorByName = new Map(aisles.map((a) => [a.name, a.color]));
  const boughtOnLeft = handedness === "left";

  return (
    <section className="rise-in mb-6" aria-labelledby="dagens-koeb-heading">
      <h2
        id="dagens-koeb-heading"
        className="font-heading mb-2 text-lg font-semibold text-pine"
      >
        {t.todaysBuys}
      </h2>
      <ul className="space-y-1.5">
        {checked.map((item) => {
          const busy = pendingIds.has(item.id);
          const color = colorByName.get(item.aisle) ?? "default";
          const bought = (
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggle(item, false)}
              aria-pressed
              aria-label={t.unmarkBought(item.name)}
              className="h-10 shrink-0 rounded-lg bg-pine px-3 text-sm font-semibold tracking-wide text-primary-foreground transition-colors disabled:opacity-60"
            >
              {t.bought}
            </button>
          );
          return (
            <li key={item.id}>
              <div
                className="flex h-12 items-center gap-2 rounded-xl border px-2.5"
                style={aisleColorStyle(color)}
              >
                {boughtOnLeft ? bought : null}
                <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                  {item.name}
                </span>
                <span className="max-w-[40%] shrink-0 truncate text-right text-[11px] font-medium tracking-wide opacity-70">
                  {item.aisle}
                </span>
                {!boughtOnLeft ? bought : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
