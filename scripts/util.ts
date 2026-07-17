// Small shared helpers used across the data-generation scripts.

export interface SettledOutcome<TItem, TResult> {
  item: TItem;
  result: TResult;
}

export interface SettledFailure<TItem> {
  item: TItem;
  error: string;
}

export interface SettledAllResult<TItem, TResult> {
  successes: SettledOutcome<TItem, TResult>[];
  failures: SettledFailure<TItem>[];
}

/**
 * Runs `fn` independently for every item, with limited concurrency, and
 * never lets one item's failure abort the others: each item either
 * succeeds or is recorded as a failure. Used so that one broken Kalshi
 * series or one unreachable crypto asset cannot destroy the rest of the
 * dashboard's data, and so we never hammer upstream APIs with unbounded
 * parallel series/asset pipelines.
 */
export async function processIndependently<TItem, TResult>(
  items: ReadonlyArray<TItem>,
  fn: (item: TItem) => Promise<TResult>,
  concurrency = items.length || 1,
): Promise<SettledAllResult<TItem, TResult>> {
  const successes: SettledOutcome<TItem, TResult>[] = [];
  const failures: SettledFailure<TItem>[] = [];

  async function worker(queue: TItem[]): Promise<void> {
    for (const item of queue) {
      try {
        const result = await fn(item);
        successes.push({ item, result });
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : String(reason);
        failures.push({ item, error: message });
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  const lanes: TItem[][] = Array.from({ length: workerCount }, () => []);
  items.forEach((item, i) => {
    (lanes[i % workerCount] as TItem[]).push(item);
  });

  await Promise.all(lanes.map((lane) => worker(lane)));

  return { successes, failures };
}

/** Ensures a value is a finite, non-NaN number, or null. Never returns NaN/Infinity/undefined. */
export function toFiniteOrNull(value: unknown): number | null {
  if (typeof value !== "number") return null;
  return Number.isFinite(value) ? value : null;
}

/** Rounds to a fixed number of decimal places while preserving null for missing data. */
export function roundOrNull(value: number | null, decimals = 6): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** UTC calendar date string (YYYY-MM-DD) for a Unix-seconds timestamp. */
export function utcDateFromUnixSeconds(unixSeconds: number): string {
  const iso = new Date(unixSeconds * 1000).toISOString();
  return iso.slice(0, 10);
}

/** True for Saturday/Sunday in UTC. */
export function isWeekendUtc(dateStr: string): boolean {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** Generates consecutive UTC weekday (Mon-Fri) calendar date strings, oldest first. */
export function weekdayDateRangeUtc(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()),
  );
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  while (cursor.getTime() <= end.getTime()) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!isWeekendUtc(dateStr)) dates.push(dateStr);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
