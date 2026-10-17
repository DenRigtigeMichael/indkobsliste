"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import {
  AISLE_PALETTE,
  aisleColorStyle,
  normalizeAisleColor,
} from "@/lib/aisle-colors";
import type { AisleDef } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  aisles: AisleDef[];
  busy: boolean;
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (
    id: string,
    details: { name?: string; color?: string },
  ) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
};

export function CategoryAdmin({
  aisles,
  busy,
  onCreate,
  onUpdate,
  onReorder,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("default");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AisleDef | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("default");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onCreate(newName, newColor);
      setNewName("");
      setNewColor("default");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunne ikke oprette kategori.",
      );
    }
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError(null);
    try {
      await onUpdate(editing.id, { name: editName, color: editColor });
      setEditing(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunne ikke gemme kategorien.",
      );
    }
  }

  async function move(id: string, direction: "up" | "down") {
    const index = aisles.findIndex((a) => a.id === id);
    if (index < 0) return;
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= aisles.length) return;
    const next = [...aisles];
    const tmp = next[index]!;
    next[index] = next[swap]!;
    next[swap] = tmp;
    setError(null);
    try {
      await onReorder(next.map((a) => a.id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke ændre rækkefølgen.",
      );
    }
  }

  return (
    <section
      className="mt-8 space-y-3 rounded-2xl border border-border/70 bg-white/45 p-4 backdrop-blur-sm"
      aria-labelledby="category-admin-heading"
    >
      <div>
        <h2
          id="category-admin-heading"
          className="font-heading text-lg font-semibold text-pine"
        >
          Kategorier
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Opret, omdøb, farvelæg og flyt afdelinger — begge telefoner ser det.
        </p>
      </div>

      <ul className="space-y-1.5">
        {aisles.map((aisle, index) => (
          <li key={aisle.id}>
            <div className="flex h-11 items-center gap-1.5 rounded-xl border border-border/60 bg-white/70 px-1.5">
              <button
                type="button"
                className="size-8 shrink-0 rounded-md border"
                style={aisleColorStyle(aisle.color)}
                aria-label={`Ret farve for ${aisle.name}`}
                disabled={busy}
                onClick={() => {
                  setEditing(aisle);
                  setEditName(aisle.name);
                  setEditColor(normalizeAisleColor(aisle.color));
                }}
              />
              <button
                type="button"
                className="min-w-0 flex-1 truncate px-1 text-left text-sm font-medium"
                disabled={busy}
                onClick={() => {
                  setEditing(aisle);
                  setEditName(aisle.name);
                  setEditColor(normalizeAisleColor(aisle.color));
                }}
              >
                {aisle.name}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 shrink-0"
                disabled={busy || index === 0}
                aria-label={`Flyt ${aisle.name} op`}
                onClick={() => void move(aisle.id, "up")}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 shrink-0"
                disabled={busy || index === aisles.length - 1}
                aria-label={`Flyt ${aisle.name} ned`}
                onClick={() => void move(aisle.id, "down")}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="space-y-2 border-t border-border/50 pt-3">
        <Label htmlFor="new-category">Ny kategori</Label>
        <div className="flex gap-2">
          <Input
            id="new-category"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Fx Frost"
            className="h-10 bg-white/80"
            disabled={busy}
          />
          <Button type="submit" className="h-10 shrink-0" disabled={busy}>
            <Plus className="size-4" />
            Tilføj
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AISLE_PALETTE.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              title={swatch.label}
              aria-label={swatch.label}
              aria-pressed={newColor === swatch.id}
              disabled={busy}
              className={`size-7 rounded-full border-2 ${
                newColor === swatch.id
                  ? "border-pine ring-2 ring-pine/30"
                  : "border-transparent"
              }`}
              style={aisleColorStyle(swatch.id)}
              onClick={() => setNewColor(swatch.id)}
            />
          ))}
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-overdue px-3 py-2 text-sm text-overdue-fg"
        >
          {error}
        </p>
      ) : null}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ret kategori</DialogTitle>
            <DialogDescription>
              Omdøb eller skift farve. Varer følger det nye navn.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Navn</Label>
              <Input
                id="edit-category-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label>Farve</Label>
              <div className="flex flex-wrap gap-1.5">
                {AISLE_PALETTE.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    title={swatch.label}
                    aria-label={swatch.label}
                    aria-pressed={editColor === swatch.id}
                    disabled={busy}
                    className={`size-8 rounded-full border-2 ${
                      editColor === swatch.id
                        ? "border-pine ring-2 ring-pine/30"
                        : "border-transparent"
                    }`}
                    style={aisleColorStyle(swatch.id)}
                    onClick={() => setEditColor(swatch.id)}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Annuller
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                Gem
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
