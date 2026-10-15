import assert from "node:assert/strict";
import { computeCadence, estimateIntervalDays } from "./cadence";

const day = 1000 * 60 * 60 * 24;

assert.equal(estimateIntervalDays([]), null);
assert.equal(estimateIntervalDays([Date.now()]), null);

const t0 = Date.parse("2026-01-01T12:00:00.000Z");
const interval = estimateIntervalDays([t0, t0 + 7 * day, t0 + 14 * day]);
assert.equal(interval, 7);

const due = computeCadence({
  lastPurchasedAt: new Date(t0).toISOString(),
  estimatedIntervalDays: 7,
  now: new Date(t0 + 6.5 * day),
});
assert.equal(due.cadenceStatus, "due");

const overdue = computeCadence({
  lastPurchasedAt: new Date(t0).toISOString(),
  estimatedIntervalDays: 7,
  now: new Date(t0 + 8 * day),
});
assert.equal(overdue.cadenceStatus, "overdue");

const ok = computeCadence({
  lastPurchasedAt: new Date(t0).toISOString(),
  estimatedIntervalDays: 7,
  now: new Date(t0 + 2 * day),
});
assert.equal(ok.cadenceStatus, "ok");

console.log("cadence tests ok");
