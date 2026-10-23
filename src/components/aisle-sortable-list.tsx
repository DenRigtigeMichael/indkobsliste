"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { Item } from "@/lib/types";
import { usePrefs, useT } from "@/lib/i18n";
import type { Handedness } from "@/lib/preferences";
import { Button } from "@/components/ui/button";

function topDropId(aisle: string) {
  return `__top__:${aisle}`;
}

/** Color-only cue when the learned buy interval has elapsed. */
function rowHighlight(item: Item): string {
  if (item.cadenceStatus === "overdue") {
    return "border-overdue-fg/40 bg-overdue";
  }
  if (item.cadenceStatus === "due") {
    return "border-due-fg/40 bg-due";
  }
  return "border-border/60 bg-white/70";
}

function BoughtControl({
  item,
  busy,
  onToggle,
}: {
  item: Item;
  busy: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onToggle(!item.checked)}
      aria-pressed={item.checked}
      aria-label={
        item.checked ? t.unmarkBought(item.name) : t.markBought(item.name)
      }
      className={`h-10 shrink-0 rounded-lg px-3 text-sm font-semibold tracking-wide transition-colors disabled:opacity-60 ${
        item.checked
          ? "bg-pine text-primary-foreground"
          : "border border-pine/35 bg-white/90 text-pine active:bg-secondary"
      }`}
    >
      {t.bought}
    </button>
  );
}

function ItemRowContent({
  item,
  busy,
  handedness,
  dragHandleProps,
  isDragging,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Item;
  busy: boolean;
  handedness: Handedness;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const cueLabel =
    item.cadenceStatus === "overdue"
      ? t.buyNow
      : item.cadenceStatus === "due"
        ? t.dueSoon
        : undefined;

  const bought = (
    <BoughtControl item={item} busy={busy} onToggle={onToggle} />
  );

  const nameBtn = (
    <button
      type="button"
      className="flex min-w-0 flex-1 items-center gap-2 text-left"
      onClick={onEdit}
      disabled={busy}
    >
      <span
        className={
          item.checked
            ? "truncate text-sm text-muted-foreground"
            : "truncate text-sm font-medium text-foreground"
        }
      >
        {item.name}
      </span>
      {cueLabel ? <span className="sr-only">{cueLabel}</span> : null}
    </button>
  );

  return (
    <div
      className={`flex h-12 items-center gap-2 rounded-xl border px-2 backdrop-blur-sm ${rowHighlight(item)} ${
        isDragging ? "shadow-md ring-1 ring-pine/20" : ""
      }`}
      title={cueLabel}
    >
      <button
        type="button"
        className="flex size-9 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground active:bg-secondary/80"
        aria-label={t.dragItem(item.name)}
        {...dragHandleProps}
      >
        <GripVertical className="size-4" />
      </button>

      {handedness === "left" ? (
        <>
          {bought}
          {nameBtn}
        </>
      ) : (
        <>
          {nameBtn}
          {bought}
        </>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-9 shrink-0 text-destructive hover:bg-overdue hover:text-overdue-fg"
        disabled={busy}
        aria-label={t.removeItemAria(item.name)}
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function SortableItemRow({
  item,
  busy,
  handedness,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Item;
  busy: boolean;
  handedness: Handedness;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="list-none">
      <ItemRowContent
        item={item}
        busy={busy}
        handedness={handedness}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </li>
  );
}

function TopDropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`-mb-1 h-4 shrink-0 rounded-md transition-colors ${
        isOver ? "bg-pine/20" : "bg-transparent"
      }`}
      aria-hidden
    />
  );
}

function sameOrder(a: Item[], b: Item[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.id === b[index]?.id);
}

/** Prefer the top drop zone / pointer hits so index 0 is reachable when dragging up. */
const aisleCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const topHit = pointerHits.find((hit) =>
      String(hit.id).startsWith("__top__:"),
    );
    return topHit ? [topHit] : pointerHits;
  }
  return closestCorners(args);
};

export function AisleSortableList({
  aisle,
  items,
  pendingIds,
  onReorder,
  onToggle,
  onEdit,
  onDelete,
  onDraggingChange,
}: {
  aisle: string;
  items: Item[];
  pendingIds: Set<string>;
  onReorder: (aisle: string, orderedIds: string[]) => Promise<void>;
  onToggle: (item: Item, checked: boolean) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const { handedness } = usePrefs();
  const [overrideItems, setOverrideItems] = useState<Item[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragOriginRef = useRef<Item[] | null>(null);
  const localItems = overrideItems ?? items;
  const topId = topDropId(aisle);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => localItems.map((i) => i.id), [localItems]);
  const activeItem = localItems.find((i) => i.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    dragOriginRef.current = items;
    setOverrideItems(items);
    setActiveId(String(event.active.id));
    onDraggingChange?.(true);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    setOverrideItems((current) => {
      const baseline = current ?? items;
      const activeIndex = baseline.findIndex((i) => i.id === active.id);
      if (activeIndex < 0) return current;

      if (String(over.id) === topId) {
        if (activeIndex === 0) return current;
        return arrayMove(baseline, activeIndex, 0);
      }

      if (active.id === over.id) return current;

      const overIndex = baseline.findIndex((i) => i.id === over.id);
      if (overIndex < 0) return current;
      if (activeIndex === overIndex) return current;

      return arrayMove(baseline, activeIndex, overIndex);
    });
  }

  async function persistIfChanged(next: Item[]) {
    const origin = dragOriginRef.current ?? items;
    dragOriginRef.current = null;
    setActiveId(null);
    onDraggingChange?.(false);

    if (sameOrder(next, origin)) {
      setOverrideItems(null);
      return;
    }

    setOverrideItems(next);
    try {
      await onReorder(
        aisle,
        next.map((i) => i.id),
      );
    } finally {
      setOverrideItems(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const baseline = overrideItems ?? items;

    let next = baseline;
    if (over) {
      if (String(over.id) === topId) {
        const from = next.findIndex((i) => i.id === active.id);
        if (from > 0) next = arrayMove(next, from, 0);
      } else if (active.id !== over.id) {
        const oldIndex = next.findIndex((i) => i.id === active.id);
        const newIndex = next.findIndex((i) => i.id === over.id);
        if (oldIndex >= 0 && newIndex >= 0) {
          next = arrayMove(next, oldIndex, newIndex);
        }
      }
    }

    await persistIfChanged(next);
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverrideItems(null);
    dragOriginRef.current = null;
    onDraggingChange?.(false);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={aisleCollisionDetection}
      measuring={{
        droppable: { strategy: MeasuringStrategy.Always },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(event) => {
        void handleDragEnd(event);
      }}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div>
          <TopDropZone id={topId} />
          <ul className="space-y-1.5">
            {localItems.map((item) => (
              <SortableItemRow
                key={item.id}
                item={item}
                busy={pendingIds.has(item.id)}
                handedness={handedness}
                onToggle={(checked) => onToggle(item, checked)}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </ul>
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="pointer-events-none">
            <ItemRowContent
              item={activeItem}
              busy={false}
              handedness={handedness}
              isDragging
              onToggle={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
