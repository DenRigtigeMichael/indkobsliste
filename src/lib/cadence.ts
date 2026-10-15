import type { CadenceStatus } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DUE_RATIO = 0.85;
const OVERDUE_RATIO = 1.1;

/** Median gap between purchase timestamps (ms), needing ≥2 events. */
export function estimateIntervalDays(purchaseTimesMs: number[]): number | null {
  if (purchaseTimesMs.length < 2) return null;

  const sorted = [...purchaseTimesMs].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]! - sorted[i - 1]!;
    if (gap > 0) gaps.push(gap);
  }
  if (gaps.length === 0) return null;

  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const medianMs =
    gaps.length % 2 === 0
      ? (gaps[mid - 1]! + gaps[mid]!) / 2
      : gaps[mid]!;

  return Math.max(1, Math.round((medianMs / MS_PER_DAY) * 10) / 10);
}

export function computeCadence(options: {
  lastPurchasedAt: string | null;
  estimatedIntervalDays: number | null;
  now?: Date;
}): {
  cadenceStatus: CadenceStatus;
  daysUntilDue: number | null;
} {
  const { lastPurchasedAt, estimatedIntervalDays, now = new Date() } = options;

  if (!lastPurchasedAt || estimatedIntervalDays == null) {
    return { cadenceStatus: "unknown", daysUntilDue: null };
  }

  const last = new Date(lastPurchasedAt).getTime();
  if (Number.isNaN(last)) {
    return { cadenceStatus: "unknown", daysUntilDue: null };
  }

  const daysSince = (now.getTime() - last) / MS_PER_DAY;
  const dueAt = estimatedIntervalDays * DUE_RATIO;
  const overdueAt = estimatedIntervalDays * OVERDUE_RATIO;
  const daysUntilDue = Math.round((estimatedIntervalDays - daysSince) * 10) / 10;

  if (daysSince >= overdueAt) {
    return { cadenceStatus: "overdue", daysUntilDue };
  }
  if (daysSince >= dueAt) {
    return { cadenceStatus: "due", daysUntilDue };
  }
  return { cadenceStatus: "ok", daysUntilDue };
}
