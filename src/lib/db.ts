import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { customAlphabet } from "nanoid";
import {
  defaultAisle,
  getAisleOrder,
  getAisles,
  normalizeAisle,
} from "./aisles";
import { computeCadence, estimateIntervalDays } from "./cadence";
import type { Household, Item } from "./types";

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const makeCode = customAlphabet(CODE_ALPHABET, 6);
const makeId = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  12,
);

type HouseholdRow = {
  code: string;
  created_at: string;
};

type ItemRow = {
  id: string;
  household_code: string;
  name: string;
  aisle: string;
  checked: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

declare global {
  var __indkobslisteDb: Database.Database | undefined;
}

function dbPath() {
  const fromEnv = process.env.DATABASE_PATH?.trim();
  if (fromEnv) {
    fs.mkdirSync(path.dirname(fromEnv), { recursive: true });
    return fromEnv;
  }

  // Railway Volume typically mounts at /data
  if (process.env.RAILWAY_ENVIRONMENT || fs.existsSync("/data")) {
    try {
      fs.mkdirSync("/data", { recursive: true });
      return path.join("/data", "indkobsliste.sqlite");
    } catch {
      // fall through to local ./data
    }
  }

  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "indkobsliste.db");
}

function migrate(db: Database.Database) {
  const cols = db
    .prepare(`PRAGMA table_info(items)`)
    .all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("sort_order")) {
    db.exec(
      `ALTER TABLE items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
    );
  }

  // Rename legacy aisles to current labels
  db.prepare(
    `UPDATE items SET aisle = ? WHERE aisle = ?`,
  ).run("Drikkevare/Snacks", "Vin");
  db.prepare(
    `UPDATE items SET aisle = ? WHERE aisle = ?`,
  ).run("Animal", "Kød/fisk");
  db.prepare(
    `UPDATE items SET aisle = ? WHERE aisle = ?`,
  ).run("Animal", "Kød/Fisk");

  // Backfill stable per-aisle order for rows still at 0 collision
  const households = db
    .prepare(`SELECT code FROM households`)
    .all() as { code: string }[];

  for (const { code } of households) {
    const rows = db
      .prepare(
        `SELECT id, aisle, sort_order, created_at FROM items
         WHERE household_code = ? ORDER BY aisle ASC, sort_order ASC, created_at ASC`,
      )
      .all(code) as {
      id: string;
      aisle: string;
      sort_order: number;
      created_at: string;
    }[];

    const byAisle = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byAisle.get(row.aisle) ?? [];
      list.push(row);
      byAisle.set(row.aisle, list);
    }

    const update = db.prepare(
      `UPDATE items SET sort_order = ? WHERE id = ?`,
    );
    for (const list of byAisle.values()) {
      const hasDupes =
        new Set(list.map((r) => r.sort_order)).size !== list.length;
      if (!hasDupes) continue;
      list.forEach((row, index) => {
        update.run(index, row.id);
      });
    }
  }
}

function getDb() {
  if (!globalThis.__indkobslisteDb) {
    const db = new Database(dbPath());
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS households (
        code TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        household_code TEXT NOT NULL REFERENCES households(code) ON DELETE CASCADE,
        name TEXT NOT NULL,
        aisle TEXT NOT NULL,
        checked INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        purchased_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_items_household ON items(household_code);
      CREATE INDEX IF NOT EXISTS idx_purchases_item ON purchases(item_id);
    `);
    globalThis.__indkobslisteDb = db;
  }
  migrate(globalThis.__indkobslisteDb);
  return globalThis.__indkobslisteDb;
}

function mapItem(row: ItemRow): Item {
  const purchases = getDb()
    .prepare(
      `SELECT purchased_at FROM purchases WHERE item_id = ? ORDER BY purchased_at ASC`,
    )
    .all(row.id) as { purchased_at: string }[];

  const times = purchases.map((p) => new Date(p.purchased_at).getTime());
  const estimatedIntervalDays = estimateIntervalDays(times);
  const lastPurchasedAt =
    purchases.length > 0 ? purchases[purchases.length - 1]!.purchased_at : null;
  const { cadenceStatus, daysUntilDue } = computeCadence({
    lastPurchasedAt,
    estimatedIntervalDays,
  });

  const aisle = normalizeAisle(row.aisle) ?? defaultAisle();

  return {
    id: row.id,
    householdId: row.household_code,
    name: row.name,
    aisle,
    checked: row.checked === 1,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastPurchasedAt,
    estimatedIntervalDays,
    purchaseCount: purchases.length,
    cadenceStatus,
    daysUntilDue,
  };
}

function sortItems(items: Item[]): Item[] {
  const order = getAisleOrder();
  const unknownRank = 10_000;
  return [...items].sort((a, b) => {
    const aisleDiff =
      (order[a.aisle] ?? unknownRank) - (order[b.aisle] ?? unknownRank);
    if (aisleDiff !== 0) return aisleDiff;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, "da");
  });
}

function withAisles(
  household: Omit<Household, "aisles"> | Household,
): Household {
  return { ...household, aisles: getAisles() };
}

function getItemRow(itemId: string, householdCode: string): ItemRow | undefined {
  return getDb()
    .prepare(
      `SELECT id, household_code, name, aisle, checked, sort_order, created_at, updated_at
       FROM items WHERE id = ? AND household_code = ?`,
    )
    .get(itemId, householdCode) as ItemRow | undefined;
}

function nextSortOrder(householdCode: string, aisle: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_order
       FROM items WHERE household_code = ? AND aisle = ?`,
    )
    .get(householdCode, aisle) as { max_order: number };
  return row.max_order + 1;
}

export function createHousehold(): Household {
  const db = getDb();
  const now = new Date().toISOString();
  let code = makeCode();
  for (let i = 0; i < 8; i++) {
    try {
      db.prepare(
        `INSERT INTO households (code, created_at) VALUES (?, ?)`,
      ).run(code, now);
      return withAisles({ code, createdAt: now, items: [] });
    } catch {
      code = makeCode();
    }
  }
  throw new Error("Kunne ikke oprette husstandskode");
}

export function getHousehold(code: string): Household | null {
  const db = getDb();
  const normalized = code.trim().toUpperCase();
  const household = db
    .prepare(`SELECT code, created_at FROM households WHERE code = ?`)
    .get(normalized) as HouseholdRow | undefined;
  if (!household) return null;

  const rows = db
    .prepare(
      `SELECT id, household_code, name, aisle, checked, sort_order, created_at, updated_at
       FROM items WHERE household_code = ?`,
    )
    .all(normalized) as ItemRow[];

  return withAisles({
    code: household.code,
    createdAt: household.created_at,
    items: sortItems(rows.map(mapItem)),
  });
}

export function addItem(
  code: string,
  name: string,
  aisle: string,
): Item | null {
  const db = getDb();
  const household = getHousehold(code);
  if (!household) return null;

  const now = new Date().toISOString();
  const id = makeId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Varenavn mangler");

  const sortOrder = nextSortOrder(household.code, aisle);

  db.prepare(
    `INSERT INTO items (id, household_code, name, aisle, checked, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
  ).run(id, household.code, trimmed, aisle, sortOrder, now, now);

  const row = getItemRow(id, household.code);
  return row ? mapItem(row) : null;
}

export function setItemChecked(
  code: string,
  itemId: string,
  checked: boolean,
): Item | null {
  const db = getDb();
  const household = getHousehold(code);
  if (!household) return null;

  const existing = getItemRow(itemId, household.code);
  if (!existing) return null;

  const now = new Date().toISOString();
  const wasChecked = existing.checked === 1;

  db.prepare(
    `UPDATE items SET checked = ?, updated_at = ? WHERE id = ?`,
  ).run(checked ? 1 : 0, now, itemId);

  if (checked && !wasChecked) {
    db.prepare(
      `INSERT INTO purchases (id, item_id, purchased_at) VALUES (?, ?, ?)`,
    ).run(makeId(), itemId, now);
  }

  const row = getItemRow(itemId, household.code);
  return row ? mapItem(row) : null;
}

export function deleteItem(code: string, itemId: string): boolean {
  const db = getDb();
  const household = getHousehold(code);
  if (!household) return false;

  const result = db
    .prepare(`DELETE FROM items WHERE id = ? AND household_code = ?`)
    .run(itemId, household.code);

  return result.changes > 0;
}

export function moveItemWithinAisle(
  code: string,
  itemId: string,
  direction: "up" | "down",
): Household | null {
  const db = getDb();
  const household = getHousehold(code);
  if (!household) return null;

  const existing = getItemRow(itemId, household.code);
  if (!existing) return null;

  const siblings = db
    .prepare(
      `SELECT id, household_code, name, aisle, checked, sort_order, created_at, updated_at
       FROM items WHERE household_code = ? AND aisle = ?
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .all(household.code, existing.aisle) as ItemRow[];

  const index = siblings.findIndex((row) => row.id === itemId);
  if (index < 0) return null;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= siblings.length) {
    return getHousehold(household.code);
  }

  const a = siblings[index]!;
  const b = siblings[swapWith]!;
  const now = new Date().toISOString();

  const update = db.prepare(
    `UPDATE items SET sort_order = ?, updated_at = ? WHERE id = ?`,
  );
  const tx = db.transaction(() => {
    update.run(b.sort_order, now, a.id);
    update.run(a.sort_order, now, b.id);
  });
  tx();

  return getHousehold(household.code);
}

/** Persist a full within-aisle order (e.g. after drag-and-drop). */
export function reorderAisleItems(
  code: string,
  aisle: string,
  orderedIds: string[],
): Household | null {
  const db = getDb();
  const household = getHousehold(code);
  if (!household) return null;

  const siblings = db
    .prepare(
      `SELECT id FROM items WHERE household_code = ? AND aisle = ?`,
    )
    .all(household.code, aisle) as { id: string }[];

  const siblingIds = new Set(siblings.map((s) => s.id));
  if (
    orderedIds.length !== siblingIds.size ||
    orderedIds.some((id) => !siblingIds.has(id))
  ) {
    throw new Error("Ugyldig rækkefølge for afdelingen.");
  }

  const now = new Date().toISOString();
  const update = db.prepare(
    `UPDATE items SET sort_order = ?, updated_at = ? WHERE id = ? AND household_code = ?`,
  );
  const tx = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      update.run(index, now, id, household.code);
    });
  });
  tx();

  return getHousehold(household.code);
}

export function setItemAisle(
  code: string,
  itemId: string,
  aisle: string,
): Item | null {
  const db = getDb();
  const household = getHousehold(code);
  if (!household) return null;

  const existing = getItemRow(itemId, household.code);
  if (!existing) return null;
  if (existing.aisle === aisle) return mapItem(existing);

  const now = new Date().toISOString();
  const sortOrder = nextSortOrder(household.code, aisle);
  db.prepare(
    `UPDATE items SET aisle = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
  ).run(aisle, sortOrder, now, itemId);

  const row = getItemRow(itemId, household.code);
  return row ? mapItem(row) : null;
}

export function updateItemDetails(
  code: string,
  itemId: string,
  details: { name?: string; aisle?: string },
): Item | null {
  const db = getDb();
  const household = getHousehold(code);
  if (!household) return null;

  const existing = getItemRow(itemId, household.code);
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextName =
    details.name !== undefined ? details.name.trim() : existing.name;
  if (!nextName) throw new Error("Varenavn mangler");

  const currentAisle =
    normalizeAisle(existing.aisle) ?? defaultAisle();
  const nextAisle = details.aisle ?? currentAisle;
  const aisleChanged = nextAisle !== currentAisle;
  const sortOrder = aisleChanged
    ? nextSortOrder(household.code, nextAisle)
    : existing.sort_order;

  db.prepare(
    `UPDATE items SET name = ?, aisle = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
  ).run(nextName, nextAisle, sortOrder, now, itemId);

  const row = getItemRow(itemId, household.code);
  return row ? mapItem(row) : null;
}
