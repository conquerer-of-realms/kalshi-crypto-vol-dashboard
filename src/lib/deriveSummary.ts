// Freshness-aware derived summary values, computed client-side against the
// real current time (see seriesFreshness.ts for why). These intentionally
// re-derive "largest signal" / "top paper-matched channel" rather than
// trusting the corresponding fields baked into the generated JSON at build
// time, because a series' own freshness can change purely from time passing
// even when the last successful build itself is still recent.

import type { AssetSummary, SeriesSummary } from "./types.ts";
import { computeSeriesFreshness, type SeriesFreshness } from "./seriesFreshness.ts";

export interface SeriesFreshnessCounts {
  current: number;
  stale: number;
  dormant: number;
}

/** Counts valid series by freshness tier. Series with no data date at all are not counted in any tier. */
export function computeSeriesFreshnessCounts(
  series: ReadonlyArray<SeriesSummary>,
  now: Date = new Date(),
): SeriesFreshnessCounts {
  const counts: SeriesFreshnessCounts = { current: 0, stale: 0, dormant: 0 };
  for (const s of series) {
    if (s.status !== "valid") continue;
    const freshness = computeSeriesFreshness(s.latestDate, now);
    if (freshness === "fresh") counts.current += 1;
    else if (freshness === "stale") counts.stale += 1;
    else if (freshness === "dormant") counts.dormant += 1;
  }
  return counts;
}

export interface LargestSignalResult {
  ticker: string;
  absSignal: number;
}

/** Largest primary-tier abs_signal among series whose own data is currently fresh (excludes stale/dormant/experimental). */
export function computeLargestFreshKalshiSignal(
  series: ReadonlyArray<SeriesSummary>,
  now: Date = new Date(),
): LargestSignalResult | null {
  let best: LargestSignalResult | null = null;
  for (const s of series) {
    if (s.tier !== "primary" || s.status !== "valid" || s.latestAbsSignal === null) continue;
    if (computeSeriesFreshness(s.latestDate, now) !== "fresh") continue;
    if (!best || s.latestAbsSignal > best.absSignal) {
      best = { ticker: s.ticker, absSignal: s.latestAbsSignal };
    }
  }
  return best;
}

export interface TopPaperMatchedChannelResult {
  symbol: string;
  seriesTicker: string;
  percentile: number;
}

/**
 * The strongest currently-elevated (>= 70th percentile) paper-matched
 * channel. Excludes assets with no reliable channel at all (paperDirection
 * "no_signal", e.g. Avalanche) and excludes any asset whose matched series
 * is not itself currently fresh -- a stale/dormant matched series can never
 * count as an elevated signal today.
 */
export function computeTopPaperMatchedChannel(
  assets: ReadonlyArray<AssetSummary>,
  series: ReadonlyArray<SeriesSummary>,
  now: Date = new Date(),
): TopPaperMatchedChannelResult | null {
  let best: TopPaperMatchedChannelResult | null = null;
  for (const a of assets) {
    if (a.status !== "valid" || a.paperDirection === "no_signal") continue;
    if (a.primaryChannelTicker === null || a.signalPercentile90d === null) continue;
    if (a.signalPercentile90d < 70) continue;

    const matched = series.find((s) => s.ticker === a.primaryChannelTicker);
    const freshness = matched ? computeSeriesFreshness(matched.latestDate, now) : null;
    if (freshness !== "fresh") continue;

    if (!best || a.signalPercentile90d > best.percentile) {
      best = { symbol: a.symbol, seriesTicker: a.primaryChannelTicker, percentile: a.signalPercentile90d };
    }
  }
  return best;
}

/** Looks up the freshness of an asset's matched (primary channel) series. */
export function getMatchedSeriesFreshness(
  asset: AssetSummary,
  series: ReadonlyArray<SeriesSummary>,
  now: Date = new Date(),
): SeriesFreshness | null {
  if (!asset.primaryChannelTicker) return null;
  const matched = series.find((s) => s.ticker === asset.primaryChannelTicker);
  if (!matched) return null;
  return computeSeriesFreshness(matched.latestDate, now);
}
