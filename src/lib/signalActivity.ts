// Turns a matched channel's signal percentile into a display-safe activity
// tier, so the dashboard never presents the paper's historical (average,
// backward-looking) direction finding as if it were an active, right-now
// forecast. The paper relationship itself is always shown separately as
// explanatory text -- this tier only says how elevated *today's* signal is.

import type { SeriesFreshness } from "./seriesFreshness.ts";

export type SignalActivity = "no_elevated" | "watch" | "active";

const WATCH_MIN_PERCENTILE = 70;
const ACTIVE_MIN_PERCENTILE = 90;

/**
 * A stale or dormant matched series can never produce a "watch" or "active"
 * reading, regardless of what its last-known percentile was -- an old
 * signal is not an elevated signal today.
 */
export function computeSignalActivity(
  percentile: number | null | undefined,
  matchedSeriesFreshness: SeriesFreshness | null,
): SignalActivity {
  if (matchedSeriesFreshness !== "fresh") return "no_elevated";
  if (percentile === null || percentile === undefined || !Number.isFinite(percentile)) return "no_elevated";
  if (percentile >= ACTIVE_MIN_PERCENTILE) return "active";
  if (percentile >= WATCH_MIN_PERCENTILE) return "watch";
  return "no_elevated";
}

export const SIGNAL_ACTIVITY_LABEL: Record<SignalActivity, string> = {
  no_elevated: "No elevated signal",
  watch: "Watch",
  active: "Active signal",
};
