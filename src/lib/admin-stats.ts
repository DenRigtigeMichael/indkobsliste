/** Aggregate household activity. Counts only — never household codes or item names. */

export const ACTIVITY_THROTTLE_MS = 15 * 60 * 1000;
export const ACTIVE_ROLLING_MS = 7 * 24 * 60 * 60 * 1000;
export const ADMIN_WEEK_HISTORY = 8;

export type AdminWeekStat = {
  weekStart: string;
  activeHouseholds: number;
};

export type AdminStats = {
  totalHouseholds: number;
  /** Households with last_seen_at inside the rolling 7-day window. */
  activeLast7Days: number;
  /** Households with a visit during the current ISO week (Monday 00:00 UTC). */
  activeIsoWeek: number;
  /** Households whose created_at falls in the current ISO week. */
  createdIsoWeek: number;
  /** Monday (UTC) of the current ISO week, YYYY-MM-DD. */
  isoWeekStart: string;
  generatedAt: string;
  weeks: AdminWeekStat[];
};

export type WeekSeen = {
  weekStart: string;
  seenAt: string;
};

/** Monday YYYY-MM-DD of the ISO week containing `date`, in UTC. */
export function isoWeekStartUtc(date: Date): string {
  const time = date.getTime();
  if (Number.isNaN(time)) {
    throw new Error("Invalid date");
  }
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + mondayOffset);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

export function rollingWindowStart(now: Date, windowMs = ACTIVE_ROLLING_MS): string {
  return new Date(now.getTime() - windowMs).toISOString();
}

/** Oldest week first, including the ISO week that contains `now`. */
export function recentIsoWeekStarts(
  now: Date,
  count = ADMIN_WEEK_HISTORY,
): string[] {
  const current = new Date(`${isoWeekStartUtc(now)}T00:00:00.000Z`);
  const weeks: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    weeks.push(isoWeekStartUtc(new Date(current.getTime() - i * ACTIVE_ROLLING_MS)));
  }
  return weeks;
}

export function fillWeekCounts(
  now: Date,
  counts: Map<string, number>,
  count = ADMIN_WEEK_HISTORY,
): AdminWeekStat[] {
  return recentIsoWeekStarts(now, count).map((weekStart) => ({
    weekStart,
    activeHouseholds: counts.get(weekStart) ?? 0,
  }));
}

/**
 * Whether a list view at `now` should write activity.
 * Same ISO week and a recent timestamp is skipped. A new ISO week is recorded
 * even inside the throttle window. Older timestamps never rewind last_seen_at.
 */
export function shouldRecordSeen(
  lastSeenAt: string | null,
  now: Date,
  throttleMs = ACTIVITY_THROTTLE_MS,
): boolean {
  if (!lastSeenAt) return true;
  const prev = Date.parse(lastSeenAt);
  if (Number.isNaN(prev)) return true;
  if (now.getTime() < prev) return false;
  if (isoWeekStartUtc(new Date(prev)) !== isoWeekStartUtc(now)) return true;
  return now.getTime() - prev >= throttleMs;
}

/** Latest stamp, plus the latest stamp inside each ISO week. Invalid stamps are dropped. */
export function backfillSeenFromStamps(stamps: string[]): {
  lastSeenAt: string;
  weeks: WeekSeen[];
} | null {
  const valid = stamps.filter((stamp) => !Number.isNaN(Date.parse(stamp)));
  if (valid.length === 0) return null;

  let lastSeenAt = valid[0]!;
  let lastSeenMs = Date.parse(lastSeenAt);
  const byWeek = new Map<string, { seenAt: string; ms: number }>();

  for (const stamp of valid) {
    const ms = Date.parse(stamp);
    if (ms > lastSeenMs) {
      lastSeenAt = stamp;
      lastSeenMs = ms;
    }
    const weekStart = isoWeekStartUtc(new Date(ms));
    const prev = byWeek.get(weekStart);
    if (!prev || ms > prev.ms) {
      byWeek.set(weekStart, { seenAt: stamp, ms });
    }
  }

  const weeks = [...byWeek.entries()]
    .map(([weekStart, value]) => ({ weekStart, seenAt: value.seenAt }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : a.weekStart > b.weekStart ? 1 : 0));

  return { lastSeenAt, weeks };
}
