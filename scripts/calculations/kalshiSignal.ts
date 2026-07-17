// Kalshi volume-weighted probability-change signal (spec Part 2).
//
//   delta_vw(s,t) = sum_j( V(j,t) * [p(j,t) - p(j,t-1)] ) / sum_j( V(j,t) )
//   abs_signal(s,t) = abs(delta_vw(s,t))
//   fed_dovish(t) = -delta_vw(KXFED,t)

export interface MarketDailyObservation {
  ticker: string;
  /** Dollar volume (or best defensible approximation). Must be finite and > 0 to contribute. */
  weight: number | null | undefined;
  /** Closing YES probability on day t-1. */
  previousClose: number | null | undefined;
  /** Closing YES probability on day t. */
  currentClose: number | null | undefined;
}

export interface DeltaVwResult {
  deltaVw: number | null;
  absSignal: number | null;
  totalWeight: number;
  marketCount: number;
}

function isPositiveFinite(v: number | null | undefined): v is number {
  return v !== null && v !== undefined && Number.isFinite(v) && v > 0;
}

function isFiniteNumber(v: number | null | undefined): v is number {
  return v !== null && v !== undefined && Number.isFinite(v);
}

/**
 * Computes the volume-weighted probability-change signal for one series on
 * one day. Markets missing a previous close, missing a current close, or
 * with non-positive weight are excluded from the aggregate rather than
 * treated as zero. Zero aggregate weight (e.g. no active markets that day)
 * yields `null`, never a fabricated zero signal.
 */
export function computeDeltaVw(observations: ReadonlyArray<MarketDailyObservation>): DeltaVwResult {
  const valid = observations.filter(
    (o) => isPositiveFinite(o.weight) && isFiniteNumber(o.previousClose) && isFiniteNumber(o.currentClose),
  );

  const totalWeight = valid.reduce((sum, o) => sum + (o.weight as number), 0);

  if (valid.length === 0 || totalWeight <= 0) {
    return { deltaVw: null, absSignal: null, totalWeight: 0, marketCount: 0 };
  }

  const numerator = valid.reduce(
    (sum, o) => sum + (o.weight as number) * ((o.currentClose as number) - (o.previousClose as number)),
    0,
  );

  const deltaVw = numerator / totalWeight;

  return {
    deltaVw,
    absSignal: Math.abs(deltaVw),
    totalWeight,
    marketCount: valid.length,
  };
}

/** fed_dovish(t) = -delta_vw(KXFED,t). Positive means rate expectations shifted downward. */
export function computeFedDovish(deltaVwKxfed: number | null | undefined): number | null {
  if (!isFiniteNumber(deltaVwKxfed)) return null;
  return -deltaVwKxfed;
}

/**
 * Dollar-volume approximation, applied in priority order per spec Part 2:
 *   1. A direct dollar-volume field (handled upstream if the API exposes one).
 *   2. volume_fp * mean_price
 *   3. volume_fp * close_price (if mean_price unavailable)
 *   4. null if price is missing or zero (market/day excluded upstream).
 */
export function approximateDollarVolume(
  volumeFp: number | null | undefined,
  meanPrice: number | null | undefined,
  closePrice: number | null | undefined,
): number | null {
  if (!isPositiveFinite(volumeFp)) return null;
  const price = isPositiveFinite(meanPrice) ? meanPrice : isPositiveFinite(closePrice) ? closePrice : null;
  if (price === null) return null;
  return volumeFp * price;
}
