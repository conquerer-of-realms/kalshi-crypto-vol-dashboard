// Client-side derivation of rolling percentile series for the "signal vs
// volatility lens" chart. Reuses the exact same percentile calculation the
// data-generation scripts use server-side (scripts/calculations/percentile.ts
// has no Node-specific dependencies, so it bundles cleanly into the browser
// build too) -- one formula, one implementation, used in both places.
import { computeTrailingPercentile } from "../../scripts/calculations/percentile.ts";

export interface DatedValue {
  date: string;
  value: number | null;
}

export interface DatedPercentile {
  date: string;
  percentile: number | null;
}

export function computeRollingPercentileSeries(
  values: ReadonlyArray<DatedValue>,
  windowSize: number,
  minValidObservations = 30,
): DatedPercentile[] {
  return values.map((entry, i) => {
    const windowStart = Math.max(0, i - windowSize + 1);
    const windowValues = values.slice(windowStart, i + 1).map((v) => v.value);
    const result = computeTrailingPercentile(windowValues, minValidObservations);
    return { date: entry.date, percentile: result.percentile };
  });
}
