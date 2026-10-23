"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { deriveHouseholdKey } from "@/lib/crypto-client";
import { hydrateHousehold, openItem, sealItemName } from "@/lib/crypto-sync";
import { useT } from "@/lib/i18n";
import type { AisleDef, Household, Item } from "@/lib/types";
import { aisleNames } from "@/lib/types";
import { AisleSortableList } from "@/components/aisle-sortable-list";
import { CategoryAdmin } from "@/components/category-admin";
import { DagensKoeb } from "@/components/dagens-koeb";
import { SettingsGear } from "@/components/settings-dialog";
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
  const t = useT();
  const [household, setHousehold] = useState<Household | null>(null);
  const [aisles, setAisles] = useState<AisleDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [aisle, setAisle] = useState("Grønt");
  const [adding, setAdding] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editAisle, setEditAisle] = useState("Grønt");
  const [savingEdit, setSavingEdit] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [aisleBusy, setAisleBusy] = useState(false);

  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  const migratingIdsRef = useRef<Set<string>>(new Set());

  const applyAisles = useCallback((next: AisleDef[]) => {
    setAisles(next);
    setHousehold((prev) => (prev ? { ...prev, aisles: next } : prev));
    const names = aisleNames(next);
    setAisle((prev) => (names.includes(prev) ? prev : names[0] ?? "Grønt"));
    setEditAisle((prev) => (names.includes(prev) ? prev : names[0] ?? "Grønt"));
  }, []);

  const unlockHousehold = useCallback(
    async (data: Household): Promise<Household> => {
      const key = await deriveHouseholdKey(code, data.cryptoSalt);
      cryptoKeyRef.current = key;
      return hydrateHousehold(data, key, {
        code,
        migratingIds: migratingIdsRef.current,
      });
    },
    [code],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const data = await fetchHousehold(code);
        const unlocked = await unlockHousehold(data);
        setHousehold(unlocked);
        if (unlocked.aisles?.length) {
          applyAisles(unlocked.aisles);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.loadFailed);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [applyAisles, code, t.loadFailed, unlockHousehold],
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
        const unlocked = await unlockHousehold(data);
        if (!alive) return;
        setHousehold(unlocked);
        const nextAisles = unlocked.aisles?.length
          ? unlocked.aisles
          : aisleList ?? [];
        if (nextAisles.length) {
          applyAisles(nextAisles);
        }
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : t.loadFailed);
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
  }, [applyAisles, aisleBusy, code, dragging, t.loadFailed, unlockHousehold]);

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
      setActionError(t.needItemName);
      return;
    }
    const key = cryptoKeyRef.current;
    if (!key) {
      setActionError(t.addFailed);
      return;
    }
    setAdding(true);
    try {
      const sealed = await sealItemName(name, key);
      const created = await addItem(code, sealed, aisle);
      const opened = await openItem(created, key);
      setName("");
      setHousehold((prev) =>
        prev ? { ...prev, items: [...prev.items, opened] } : prev,
      );
      await load({ silent: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.addFailed);
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
      const key = cryptoKeyRef.current;
      const opened = key ? await openItem(updated, key) : { ...updated, name: item.name };
      setHousehold((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === opened.id ? opened : i)),
            }
          : prev,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.updateFailed);
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
      setActionError(err instanceof Error ? err.message : t.deleteFailed);
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
      const unlocked = await unlockHousehold(next);
      setHousehold(unlocked);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.reorderFailed);
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
    const key = cryptoKeyRef.current;
    if (!key) {
      setActionError(t.saveFailed);
      return;
    }
    setActionError(null);
    setSavingEdit(true);
    markPending(editingItem.id, true);
    try {
      const sealed = await sealItemName(editName, key);
      await updateItem(code, editingItem.id, {
        name: sealed,
        aisle: editAisle,
      });
      setEditingItem(null);
      await load({ silent: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      markPending(editingItem.id, false);
      setSavingEdit(false);
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
        <p>{t.loadingList}</p>
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
            {t.tryAgain}
          </Button>
          <Button type="button" variant="secondary" render={<Link href="/" />}>
            {t.toHome}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-lg px-4 pb-10 pt-6">
      <header className="brand-in relative mb-6 pr-12">
        <div className="absolute right-0 top-0">
          <SettingsGear household={{ code, shareUrl }} />
        </div>
        <p className="text-sm font-medium tracking-wide text-pine/80">
          {t.sharedHousehold}
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-pine sm:text-5xl">
          {t.brand}
        </h1>
        <p className="mt-2 max-w-sm text-base text-muted-foreground">
          {t.listTagline}
        </p>
      </header>

      {household && household.items.length === 0 ? (
        <div className="rise-in mb-4 rounded-2xl border border-dashed border-border bg-white/40 px-5 py-6 text-center">
          <p className="font-heading text-xl text-pine">{t.emptyTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.emptyBody}</p>
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
                  {t.noItems}
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
          <Label htmlFor="item-name">{t.addItem}</Label>
          <Input
            id="item-name"
            placeholder={t.itemPlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 bg-white/80"
            disabled={adding}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-aisle">{t.aisle}</Label>
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
          {adding ? t.adding : t.addToList}
        </Button>
      </form>

      <CategoryAdmin
        aisles={aisleList}
        busy={aisleBusy}
        onCreate={onCreateAisle}
        onUpdate={onUpdateAisle}
        onReorder={onReorderAisles}
      />

      <Dialog
        open={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.editItem}</DialogTitle>
            <DialogDescription>{t.editItemBody}</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t.name}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11"
                disabled={savingEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-aisle">{t.aisle}</Label>
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
                {t.cancel}
              </Button>
              <Button type="submit" className="flex-1" disabled={savingEdit}>
                {savingEdit ? t.saving : t.save}
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
            <DialogTitle>{t.removeItem}</DialogTitle>
            <DialogDescription>
              {(() => {
                const item = household?.items.find(
                  (i) => i.id === confirmDeleteId,
                );
                return item
                  ? t.removeItemBodyNamed(item.name)
                  : t.removeItemBody;
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
              {t.cancel}
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
              {t.remove}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
