import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {
  adminSessionToken,
  checkAdminPassword,
  isAdminEnabled,
  isValidAdminSession,
  requestIsHttps,
} from "./admin-auth";
import {
  ACTIVE_ROLLING_MS,
  backfillSeenFromStamps,
  fillWeekCounts,
  isoWeekStartUtc,
  recentIsoWeekStarts,
  rollingWindowStart,
  shouldRecordSeen,
} from "./admin-stats";

assert.equal(isoWeekStartUtc(new Date("2024-01-01T00:00:00.000Z")), "2024-01-01");
assert.equal(isoWeekStartUtc(new Date("2024-01-07T23:00:00.000Z")), "2024-01-01");
assert.equal(isoWeekStartUtc(new Date("2024-01-08T00:00:00.000Z")), "2024-01-08");
assert.equal(isoWeekStartUtc(new Date("2020-06-07T23:50:00.000Z")), "2020-06-01");
assert.equal(isoWeekStartUtc(new Date("2020-06-08T00:10:00.000Z")), "2020-06-08");
assert.equal(isoWeekStartUtc(new Date("2026-11-01T12:00:00.000Z")), "2026-10-26");
assert.equal(isoWeekStartUtc(new Date("2026-11-02T12:00:00.000Z")), "2026-11-02");

const weeks = recentIsoWeekStarts(new Date("2026-11-02T12:00:00.000Z"), 3);
assert.deepEqual(weeks, ["2026-10-19", "2026-10-26", "2026-11-02"]);

const filled = fillWeekCounts(
  new Date("2026-11-02T12:00:00.000Z"),
  new Map([["2026-11-02", 2]]),
  3,
);
assert.deepEqual(filled, [
  { weekStart: "2026-10-19", activeHouseholds: 0 },
  { weekStart: "2026-10-26", activeHouseholds: 0 },
  { weekStart: "2026-11-02", activeHouseholds: 2 },
]);

const now = new Date("2026-11-04T12:00:00.000Z");
assert.equal(rollingWindowStart(now), new Date(now.getTime() - ACTIVE_ROLLING_MS).toISOString());
assert.equal(shouldRecordSeen(null, now), true);
assert.equal(shouldRecordSeen("not-a-date", now), true);
assert.equal(
  shouldRecordSeen(new Date(now.getTime() - 10 * 60 * 1000).toISOString(), now),
  false,
);
assert.equal(
  shouldRecordSeen(new Date(now.getTime() - 20 * 60 * 1000).toISOString(), now),
  true,
);
assert.equal(
  shouldRecordSeen(new Date(now.getTime() + 60 * 1000).toISOString(), now),
  false,
);
assert.equal(shouldRecordSeen("2026-11-01T23:55:00.000Z", now), true);

const derived = backfillSeenFromStamps([
  "2020-06-03T08:00:00.000Z",
  "2020-06-04T00:00:00.000Z",
  "2020-06-04T01:00:00.000Z",
  "nope",
  "2020-06-18T00:00:00.000Z",
]);
assert.ok(derived);
assert.equal(derived.lastSeenAt, "2020-06-18T00:00:00.000Z");
assert.deepEqual(derived.weeks, [
  { weekStart: "2020-06-01", seenAt: "2020-06-04T01:00:00.000Z" },
  { weekStart: "2020-06-15", seenAt: "2020-06-18T00:00:00.000Z" },
]);
assert.equal(backfillSeenFromStamps(["nope"]), null);
assert.equal(backfillSeenFromStamps([]), null);

const previousPassword = process.env.ADMIN_PASSWORD;
try {
  delete process.env.ADMIN_PASSWORD;
  assert.equal(isAdminEnabled(), false);
  assert.equal(checkAdminPassword("secret"), false);
  assert.equal(adminSessionToken(), null);
  assert.equal(isValidAdminSession("anything"), false);

  process.env.ADMIN_PASSWORD = "   ";
  assert.equal(isAdminEnabled(), false);

  process.env.ADMIN_PASSWORD = " secret\n";
  assert.equal(isAdminEnabled(), true);
  assert.equal(checkAdminPassword("secret"), true);
  assert.equal(checkAdminPassword("secret "), false);
  assert.equal(checkAdminPassword("Secret"), false);
  assert.equal(checkAdminPassword(""), false);
  assert.equal(checkAdminPassword("x".repeat(300)), false);

  const token = adminSessionToken();
  assert.equal(typeof token, "string");
  assert.equal(token && token.length > 0, true);
  assert.equal(isValidAdminSession(token), true);
  assert.equal(isValidAdminSession(`${token}x`), false);
  assert.equal(isValidAdminSession(""), false);
  assert.equal(isValidAdminSession(null), false);
  process.env.ADMIN_PASSWORD = "other-secret";
  assert.equal(isValidAdminSession(token), false);
  assert.equal(checkAdminPassword("secret"), false);
} finally {
  if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = previousPassword;
}

assert.equal(requestIsHttps(new Request("https://example.com/admin")), true);
assert.equal(requestIsHttps(new Request("http://127.0.0.1/admin")), false);
assert.equal(
  requestIsHttps(
    new Request("http://127.0.0.1/admin", {
      headers: { "x-forwarded-proto": "https" },
    }),
  ),
  true,
);
assert.equal(
  requestIsHttps(
    new Request("http://127.0.0.1/admin", {
      headers: { "x-forwarded-proto": "https, http" },
    }),
  ),
  true,
);

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "indkob-admin-"));
  const dbPath = path.join(dir, "legacy.db");
  const legacy = new Database(dbPath);
  legacy.exec(`
    CREATE TABLE households (
      code TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      crypto_salt TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      household_code TEXT NOT NULL REFERENCES households(code) ON DELETE CASCADE,
      name TEXT NOT NULL,
      aisle TEXT NOT NULL,
      checked INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE purchases (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      purchased_at TEXT NOT NULL
    );
    CREATE TABLE aisles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    INSERT INTO households (code, created_at, crypto_salt)
      VALUES ('OLDHSE', '2020-06-03T08:00:00.000Z', 'abc');
    INSERT INTO items (
      id, household_code, name, aisle, checked, sort_order, created_at, updated_at
    ) VALUES (
      'it1', 'OLDHSE', 'SENTINEL_ITEM_NAME_XYZ', 'Grønt', 0, 0,
      '2020-06-04T00:00:00.000Z', '2020-06-04T01:00:00.000Z'
    );
    INSERT INTO purchases (id, item_id, purchased_at)
      VALUES ('pu1', 'it1', '2020-06-18T00:00:00.000Z');
  `);
  legacy.close();

  process.env.DATABASE_PATH = dbPath;
  const { createHousehold, getAdminStats, noteHouseholdSeen } = await import("./db");

  const fixedNow = new Date("2026-11-02T15:00:00.000Z");
  const before = getAdminStats(fixedNow);

  const view = new Database(dbPath);
  try {
    const columns = view
      .prepare(`PRAGMA table_info(households)`)
      .all() as { name: string }[];
    assert.equal(columns.some((column) => column.name === "last_seen_at"), true);

    const backfilled = view
      .prepare(
        `SELECT last_seen_at FROM households WHERE code = ?`,
      )
      .get("OLDHSE") as { last_seen_at: string };
    assert.equal(backfilled.last_seen_at, "2020-06-18T00:00:00.000Z");

    const oldWeeks = view
      .prepare(
        `SELECT week_start, seen_at FROM household_weeks
         WHERE household_code = ? ORDER BY week_start`,
      )
      .all("OLDHSE") as { week_start: string; seen_at: string }[];
    assert.deepEqual(
      oldWeeks.map((row) => row.week_start),
      ["2020-06-01", "2020-06-15"],
    );

    assert.equal(before.totalHouseholds, 1);
    assert.equal(before.activeLast7Days, 0);
    assert.equal(before.activeIsoWeek, 0);
    assert.equal(before.createdIsoWeek, 0);
    assert.equal(before.weeks.length, 8);
    assert.equal(before.isoWeekStart, "2026-11-02");
    assert.equal(before.weeks[before.weeks.length - 1]?.weekStart, "2026-11-02");
    assert.equal(before.weeks[before.weeks.length - 1]?.activeHouseholds, 0);

    const created = createHousehold();
    const seenAt = new Date();
    noteHouseholdSeen(created.code, seenAt);
    noteHouseholdSeen("NOPE00", seenAt);

    const after = getAdminStats(seenAt);
    assert.equal(after.totalHouseholds, 2);
    assert.equal(after.activeLast7Days, 1);
    assert.equal(after.activeIsoWeek, 1);
    assert.equal(after.createdIsoWeek, 1);
    assert.equal(after.activeIsoWeek, after.weeks.at(-1)?.activeHouseholds);
    assert.deepEqual(Object.keys(after).sort(), [
      "activeIsoWeek",
      "activeLast7Days",
      "createdIsoWeek",
      "generatedAt",
      "isoWeekStart",
      "totalHouseholds",
      "weeks",
    ]);
    const serialized = JSON.stringify(after);
    assert.equal(serialized.includes(created.code), false);
    assert.equal(serialized.includes("OLDHSE"), false);
    assert.equal(serialized.includes("SENTINEL_ITEM_NAME_XYZ"), false);
    assert.equal(serialized.includes("TESTWK"), false);

    view
      .prepare(
        `INSERT INTO households (code, created_at, crypto_salt, last_seen_at)
         VALUES ('TESTWK', '2020-01-01T00:00:00.000Z', 'salt', NULL)`,
      )
      .run();
    noteHouseholdSeen("TESTWK", new Date("2020-06-07T23:50:00.000Z"));
    noteHouseholdSeen("TESTWK", new Date("2020-06-08T00:10:00.000Z"));
    noteHouseholdSeen("TESTWK", new Date("2020-06-08T00:12:00.000Z"));

    const touched = view
      .prepare(`SELECT last_seen_at FROM households WHERE code = ?`)
      .get("TESTWK") as { last_seen_at: string };
    assert.equal(touched.last_seen_at, "2020-06-08T00:10:00.000Z");
    const touchWeeks = view
      .prepare(
        `SELECT week_start FROM household_weeks
         WHERE household_code = ? ORDER BY week_start`,
      )
      .all("TESTWK") as { week_start: string }[];
    assert.deepEqual(
      touchWeeks.map((row) => row.week_start),
      ["2020-06-01", "2020-06-08"],
    );

    const finalStats = getAdminStats(seenAt);
    assert.equal(JSON.stringify(finalStats).includes("TESTWK"), false);
    assert.equal(finalStats.totalHouseholds, 3);
    assert.equal(finalStats.activeLast7Days, 1);
  } finally {
    view.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main()
  .then(() => {
    console.log("admin stats tests ok");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
