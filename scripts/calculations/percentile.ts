// Percentile-rank calculation for the latest observation within a trailing
// window of daily values. Ties are handled with the standard "mean rank"
// convention: a value's percentile is the fraction of the window strictly
// below it, plus half the fraction exactly equal to it.

export type PercentileStatus = "ok" | "insufficient_history";

export interface PercentileResult {
  percentile: number | null;
  status: PercentileStatus;
  validCount: number;
}

/**
 * @param windowValues Chronologically ordered values (oldest first) for the
 *   trailing window, with the most recent observation last. `null`/non-finite
 *   entries represent missing days and are excluded, never treated as zero.
 * @param minValidObservations Minimum count of valid (non-null, finite)
 *   values required in the window before a percentile is reported. Below
 *   this threshold the result is "insufficient_history" per spec Part 6.
 */
export function computeTrailingPercentile(
  windowValues: ReadonlyArray<number | null | undefined>,
  minValidObservations = 30,
): PercentileResult {
  const latest = windowValues[windowValues.length - 1];
  const validValues = windowValues.filter(
    (v): v is number => v !== null && v !== undefined && Number.isFinite(v),
  );

  if (latest === null || latest === undefined || !Number.isFinite(latest)) {
    return { percentile: null, status: "insufficient_history", validCount: validValues.length };
  }

  if (validValues.length < minValidObservations) {
    return { percentile: null, status: "insufficient_history", validCount: validValues.length };
  }

  let lessCount = 0;
  let equalCount = 0;
  for (const v of validValues) {
    if (v < latest) lessCount += 1;
    else if (v === latest) equalCount += 1;
  }

  const rank = (lessCount + 0.5 * equalCount) / validValues.length;
  return {
    percentile: Math.round(rank * 100 * 100) / 100,
    status: "ok",
    validCount: validValues.length,
  };
}
