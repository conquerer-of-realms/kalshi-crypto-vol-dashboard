// Crypto return and realized-volatility formulas (spec Part 2).

/** r(a,t) = ln(P(a,t) / P(a,t-1)). Returns null for non-positive or missing prices. */
export function logReturn(previousClose: number | null | undefined, currentClose: number | null | undefined): number | null {
  if (previousClose === null || previousClose === undefined || !Number.isFinite(previousClose) || previousClose <= 0) {
    return null;
  }
  if (currentClose === null || currentClose === undefined || !Number.isFinite(currentClose) || currentClose <= 0) {
    return null;
  }
  return Math.log(currentClose / previousClose);
}

/** Sample standard deviation (n - 1 denominator). Requires at least 2 values. */
export function sampleStdDev(values: ReadonlyArray<number>): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const sumSquaredDiff = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  const variance = sumSquaredDiff / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * RVol5(a,t) = sqrt(252) * sample_std_dev(r(t-4)...r(t)).
 * Requires exactly `windowSize` consecutive, valid (finite) returns; any
 * missing return in the window invalidates the whole observation rather
 * than being silently dropped or zero-filled.
 */
export function realizedVolatility(
  returns: ReadonlyArray<number | null | undefined>,
  windowSize = 5,
  annualizationFactor = 252,
): number | null {
  if (returns.length !== windowSize) return null;
  const valid: number[] = [];
  for (const r of returns) {
    if (r === null || r === undefined || !Number.isFinite(r)) return null;
    valid.push(r);
  }
  const sd = sampleStdDev(valid);
  if (sd === null) return null;
  return Math.sqrt(annualizationFactor) * sd;
}

/** Trailing simple average of the last `windowSize` non-null RVol values; null if none available. */
export function trailingAverage(
  values: ReadonlyArray<number | null | undefined>,
  windowSize: number,
): number | null {
  const window = values.slice(-windowSize).filter(
    (v): v is number => v !== null && v !== undefined && Number.isFinite(v),
  );
  if (window.length === 0) return null;
  return window.reduce((sum, v) => sum + v, 0) / window.length;
}
