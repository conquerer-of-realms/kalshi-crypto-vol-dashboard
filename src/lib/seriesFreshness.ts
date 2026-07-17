// Per-series data freshness, based on how old each series' own latest valid
// observation (`latestDate`) is -- distinct from the site-wide build
// freshness in freshness.ts, which is based on when the whole build ran.
// A series can be "dormant" (its market stopped producing daily data) even
// on a page load where the overall build itself is fresh.
//
// Computed client-side against the real current time (not baked into the
// generated JSON at build time), for the same reason the top-level
// freshness badge is: a stale/failed build must not freeze a series'
// classification at whatever it happened to be on the last successful run.

export type SeriesFreshness = "fresh" | "stale" | "dormant";

const FRESH_MAX_BUSINESS_DAYS = 3;
const STALE_MAX_CALENDAR_DAYS = 14;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toUtcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Counts weekdays (Mon-Fri) strictly after `fromMs` up to and including `toMs`. */
function countBusinessDaysBetween(fromMs: number, toMs: number): number {
  let count = 0;
  let cursor = fromMs;
  while (cursor < toMs) {
    cursor += ONE_DAY_MS;
    const day = new Date(cursor).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/**
 * Classifies a series' own data currency:
 *   - fresh:   latest observation within 3 business days
 *   - stale:   latest observation 4-14 calendar days old
 *   - dormant: latest observation more than 14 calendar days old
 * Returns null when there is no data date at all (e.g. no active markets).
 */
export function computeSeriesFreshness(
  latestDate: string | null | undefined,
  now: Date = new Date(),
): SeriesFreshness | null {
  if (!latestDate) return null;
  const latestMs = Date.parse(`${latestDate}T00:00:00Z`);
  if (Number.isNaN(latestMs)) return null;

  const todayMs = toUtcMidnight(now);
  if (todayMs <= latestMs) return "fresh";

  const calendarDaysElapsed = Math.round((todayMs - latestMs) / ONE_DAY_MS);
  const businessDaysElapsed = countBusinessDaysBetween(latestMs, todayMs);

  if (businessDaysElapsed <= FRESH_MAX_BUSINESS_DAYS) return "fresh";
  if (calendarDaysElapsed <= STALE_MAX_CALENDAR_DAYS) return "stale";
  return "dormant";
}

export const SERIES_FRESHNESS_LABEL: Record<SeriesFreshness, string> = {
  fresh: "Fresh",
  stale: "Stale",
  dormant: "Dormant",
};
