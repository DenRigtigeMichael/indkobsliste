"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { setLastHousehold } from "@/lib/last-household";
import {
  addItem,
  createAisleApi,
  deleteItem,
  fetchAisles,
  fetchHousehold,
  reorderAisle,
  reorderAislesApi,
  setItemChecked,
  updateAisleApi,
  updateItem,
} from "@/lib/api-client";
import type { AisleDef, Household, Item } from "@/lib/types";
import { aisleNames } from "@/lib/types";
import { AisleSortableList } from "@/components/aisle-sortable-list";
import { CategoryAdmin } from "@/components/category-admin";
import { DagensKoeb } from "@/components/dagens-koeb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const POLL_MS = 2000;

function groupByAisle(
  items: Item[],
  aisles: AisleDef[],
): { aisle: string; items: Item[] }[] {
  const names = aisleNames(aisles);
  const known = new Set(names);
  const groups = names.map((aisle) => ({
    aisle,
    items: items.filter((item) => item.aisle === aisle),
  }));

  const orphanNames = [
    ...new Set(items.map((i) => i.aisle).filter((a) => !known.has(a))),
  ].sort((a, b) => a.localeCompare(b, "da"));

  for (const aisle of orphanNames) {
    groups.push({
      aisle,
      items: items.filter((item) => item.aisle === aisle),
    });
  }

  return groups;
}

export function GroceryList({ code }: { code: string }) {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [aisles, setAisles] = useState<AisleDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [aisle, setAisle] = useState("Grønt");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editAisle, setEditAisle] = useState("Grønt");
  const [savingEdit, setSavingEdit] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [aisleBusy, setAisleBusy] = useState(false);

  const applyAisles = useCallback((next: AisleDef[]) => {
    setAisles(next);
    setHousehold((prev) => (prev ? { ...prev, aisles: next } : prev));
    const names = aisleNames(next);
    setAisle((prev) => (names.includes(prev) ? prev : names[0] ?? "Grønt"));
    setEditAisle((prev) => (names.includes(prev) ? prev : names[0] ?? "Grønt"));
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const data = await fetchHousehold(code);
        setHousehold(data);
        if (data.aisles?.length) {
          applyAisles(data.aisles);
        }
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Kunne ikke hente listen. Prøv igen om et øjeblik.",
        );
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [applyAisles, code],
  );

  useEffect(() => {
    let alive = true;

    async function refresh(silent: boolean) {
      try {
        const [data, aisleList] = await Promise.all([
          fetchHousehold(code),
          silent ? Promise.resolve(null) : fetchAisles().catch(() => null),
        ]);
        if (!alive) return;
        setHousehold(data);
        const nextAisles = data.aisles?.length
          ? data.aisles
          : aisleList ?? [];
        if (nextAisles.length) {
          applyAisles(nextAisles);
        }
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof Error
            ? err.message
            : "Kunne ikke hente listen. Prøv igen om et øjeblik.",
        );
      } finally {
        if (alive && !silent) setLoading(false);
      }
    }

    const boot = window.setTimeout(() => {
      void refresh(false);
    }, 0);
    const id = window.setInterval(() => {
      if (dragging || aisleBusy) return;
      void refresh(true);
    }, POLL_MS);

    setLastHousehold(code);

    return () => {
      alive = false;
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [applyAisles, aisleBusy, code, dragging]);

  const aisleList = household?.aisles?.length ? household.aisles : aisles;
  const aisleNameList = aisleNames(aisleList);

  const groups = useMemo(
    () => (household ? groupByAisle(household.items, aisleList) : []),
    [household, aisleList],
  );
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/h/${code}`
      : `/h/${code}`;

  function markPending(id: string, on: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setActionError(null);
    if (!name.trim()) {
      setActionError("Skriv et varenavn.");
      return;
    }
    setAdding(true);
    try {
      await addItem(code, name, aisle);
      setName("");
      await load({ silent: true });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Kunne ikke tilføje varen.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function onToggle(item: Item, checked: boolean) {
    setActionError(null);
    markPending(item.id, true);
    setHousehold((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === item.id ? { ...i, checked } : i,
            ),
          }
        : prev,
    );
    try {
      const updated = await setItemChecked(code, item.id, checked);
      setHousehold((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === updated.id ? updated : i)),
            }
          : prev,
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Kunne ikke opdatere varen.",
      );
      await load({ silent: true });
    } finally {
      markPending(item.id, false);
    }
  }

  async function onDelete(item: Item) {
    setActionError(null);
    markPending(item.id, true);
    const previous = household;
    setHousehold((prev) =>
      prev
        ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) }
        : prev,
    );
    setConfirmDeleteId(null);
    try {
      await deleteItem(code, item.id);
    } catch (err) {
      setHousehold(previous);
      setActionError(
        err instanceof Error ? err.message : "Kunne ikke slette varen.",
      );
    } finally {
      markPending(item.id, false);
    }
  }

  async function onReorder(nextAisle: string, orderedIds: string[]) {
    setActionError(null);
    setHousehold((prev) => {
      if (!prev) return prev;
      const inAisle = orderedIds
        .map((id) => prev.items.find((i) => i.id === id))
        .filter((i): i is Item => Boolean(i))
        .map((item, index) => ({ ...item, sortOrder: index }));
      const others = prev.items.filter((i) => i.aisle !== nextAisle);
      return { ...prev, items: [...others, ...inAisle] };
    });
    try {
      const next = await reorderAisle(code, nextAisle, orderedIds);
      setHousehold(next);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Kunne ikke ændre rækkefølgen.",
      );
      await load({ silent: true });
    }
  }

  function openEdit(item: Item) {
    setEditingItem(item);
    setEditName(item.name);
    setEditAisle(item.aisle);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingItem) return;
    setActionError(null);
    setSavingEdit(true);
    markPending(editingItem.id, true);
    try {
      await updateItem(code, editingItem.id, {
        name: editName,
        aisle: editAisle,
      });
      setEditingItem(null);
      await load({ silent: true });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Kunne ikke gemme ændringen.",
      );
    } finally {
      markPending(editingItem.id, false);
      setSavingEdit(false);
    }
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("Kunne ikke kopiere linket. Kopiér adressen manuelt.");
    }
  }

  async function onCreateAisle(nameValue: string, color: string) {
    setAisleBusy(true);
    try {
      const next = await createAisleApi(nameValue, color);
      applyAisles(next);
    } finally {
      setAisleBusy(false);
    }
  }

  async function onUpdateAisle(
    id: string,
    details: { name?: string; color?: string },
  ) {
    setAisleBusy(true);
    try {
      const next = await updateAisleApi(id, details);
      applyAisles(next);
      await load({ silent: true });
    } finally {
      setAisleBusy(false);
    }
  }

  async function onReorderAisles(orderedIds: string[]) {
    setAisleBusy(true);
    try {
      const next = await reorderAislesApi(orderedIds);
      applyAisles(next);
    } finally {
      setAisleBusy(false);
    }
  }

  if (loading && !household) {
    return (
      <div className="relative z-10 flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-muted-foreground">
        <Loader2 className="size-7 animate-spin text-pine" aria-hidden />
        <p>Henter jeres indkøbsliste…</p>
      </div>
    );
  }

  if (error && !household) {
    return (
      <div className="relative z-10 mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="rounded-lg bg-overdue px-4 py-3 text-overdue-fg">
          {error}
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void load()}>
            Prøv igen
          </Button>
          <Button type="button" variant="secondary" render={<Link href="/" />}>
            Til forsiden
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-lg px-4 pb-10 pt-6">
      <header className="brand-in mb-6">
        <p className="text-sm font-medium tracking-wide text-pine/80">
          Fælles husstand
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-pine sm:text-5xl">
          Indkøbsliste
        </h1>
        <p className="mt-2 max-w-sm text-base text-muted-foreground">
          Træk for at sortere. Farve viser når det er tid at købe igen.
        </p>
      </header>

      {household && household.items.length === 0 ? (
        <div className="rise-in mb-4 rounded-2xl border border-dashed border-border bg-white/40 px-5 py-6 text-center">
          <p className="font-heading text-xl text-pine">Listen er tom</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tilføj den første vare nedenfor — I kan begge se den med det samme.
          </p>
        </div>
      ) : null}

      {household ? (
        <DagensKoeb
          items={household.items}
          aisles={aisleList}
          pendingIds={pendingIds}
          onToggle={(item, checked) => void onToggle(item, checked)}
        />
      ) : null}

      {household ? (
        <div className="rise-in mb-8 space-y-5">
          {groups.map((group) => (
            <section key={group.aisle}>
              <h2 className="font-heading mb-2 text-lg font-semibold text-pine">
                {group.aisle}
              </h2>
              {group.items.length === 0 ? (
                <p className="mb-1 text-sm text-muted-foreground/80">
                  Ingen varer
                </p>
              ) : (
                <AisleSortableList
                  aisle={group.aisle}
                  items={group.items}
                  pendingIds={pendingIds}
                  onReorder={onReorder}
                  onToggle={(item, checked) => void onToggle(item, checked)}
                  onEdit={openEdit}
                  onDelete={(item) => setConfirmDeleteId(item.id)}
                  onDraggingChange={setDragging}
                />
              )}
            </section>
          ))}
        </div>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="mb-3 rounded-lg bg-overdue px-3 py-2 text-sm text-overdue-fg"
        >
          {actionError}
        </p>
      ) : null}

      <form
        onSubmit={onAdd}
        className="rise-in-delay space-y-3 rounded-2xl border border-border/70 bg-white/55 p-4 backdrop-blur-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="item-name">Tilføj vare</Label>
          <Input
            id="item-name"
            placeholder="Fx avocado, mælk, opvasketabs…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 bg-white/80"
            disabled={adding}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-aisle">Afdeling</Label>
          <Select
            value={aisle}
            onValueChange={(value) => {
              if (value && aisleNameList.includes(value)) {
                setAisle(value);
              }
            }}
          >
            <SelectTrigger id="item-aisle" className="h-11 w-full bg-white/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aisleNameList.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={adding}>
          <Plus className="size-4" />
          {adding ? "Tilføjer…" : "Tilføj til listen"}
        </Button>
      </form>

      <CategoryAdmin
        aisles={aisleList}
        busy={aisleBusy}
        onCreate={onCreateAisle}
        onUpdate={onUpdateAisle}
        onReorder={onReorderAisles}
      />

      <footer className="mt-8 space-y-3 border-t border-border/50 pt-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          Husstand
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-secondary px-3 py-1.5 font-mono text-sm tracking-[0.18em] text-secondary-foreground">
            {code}
          </span>
          <Dialog>
            <DialogTrigger
              render={<Button type="button" variant="outline" size="sm" />}
            >
              <Link2 className="size-4" />
              Del
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Del med din partner</DialogTitle>
                <DialogDescription>
                  Send koden eller linket — begge åbner den samme liste.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Kode</Label>
                  <p className="mt-1 font-mono text-2xl tracking-[0.2em]">
                    {code}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Link</Label>
                  <p className="mt-1 break-all text-sm">{shareUrl}</p>
                </div>
                <Button type="button" className="w-full" onClick={copyShare}>
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Kopieret
                    </>
                  ) : (
                    "Kopiér link"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => router.push("/?skift=1")}
          >
            Skift husstand
          </Button>
        </div>
      </footer>

      <Dialog
        open={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ret vare</DialogTitle>
            <DialogDescription>
              Ændr navn eller flyt til en anden afdeling.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Navn</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11"
                disabled={savingEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-aisle">Afdeling</Label>
              <Select
                value={editAisle}
                onValueChange={(value) => {
                  if (value && aisleNameList.includes(value)) {
                    setEditAisle(value);
                  }
                }}
              >
                <SelectTrigger id="edit-aisle" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aisleNameList.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setEditingItem(null)}
                disabled={savingEdit}
              >
                Annuller
              </Button>
              <Button type="submit" className="flex-1" disabled={savingEdit}>
                {savingEdit ? "Gemmer…" : "Gem"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Fjern vare?</DialogTitle>
            <DialogDescription>
              {(() => {
                const item = household?.items.find(
                  (i) => i.id === confirmDeleteId,
                );
                return item
                  ? `“${item.name}” fjernes fra listen for jer begge.`
                  : "Varen fjernes fra listen for jer begge.";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmDeleteId(null)}
            >
              Annuller
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={() => {
                const item = household?.items.find(
                  (i) => i.id === confirmDeleteId,
                );
                if (item) void onDelete(item);
              }}
            >
              <Trash2 className="size-4" />
              Fjern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
