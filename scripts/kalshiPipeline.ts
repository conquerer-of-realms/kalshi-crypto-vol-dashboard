// Orchestrates the Kalshi API client + calculation functions into a
// per-series SeriesSummary: lists markets active during the data window,
// fetches daily candlesticks, aligns them by UTC calendar date, and computes
// the volume-weighted signal for every valid trading day.

import {
  fetchHistoricalSeriesMarkets,
  fetchLiveSeriesMarkets,
  fetchManyMarketCandlesticks,
  type KalshiCandlestick,
  type KalshiMarket,
} from "./api/kalshi.ts";
import { approximateDollarVolume, computeDeltaVw, type MarketDailyObservation } from "./calculations/kalshiSignal.ts";
import { computeTrailingPercentile } from "./calculations/percentile.ts";
import type { KalshiSeriesDefinition } from "../src/lib/paperData.ts";
import type { SeriesHistoryPoint, SeriesSummary } from "../src/lib/types.ts";
import { roundOrNull, weekdayDateRangeUtc } from "./util.ts";

const MAX_MARKETS_PER_SERIES = 150;

function dedupeMarkets(markets: KalshiMarket[]): KalshiMarket[] {
  const byTicker = new Map<string, KalshiMarket>();
  for (const m of markets) byTicker.set(m.ticker, m);
  return Array.from(byTicker.values());
}

function overlapsWindow(market: KalshiMarket, windowStartMs: number, windowEndMs: number): boolean {
  const openMs = market.openTime ? Date.parse(market.openTime) : NaN;
  const closeMs = market.closeTime ? Date.parse(market.closeTime) : NaN;
  const opensBeforeWindowEnds = Number.isFinite(openMs) ? openMs <= windowEndMs : true;
  const closesAfterWindowStarts = Number.isFinite(closeMs) ? closeMs >= windowStartMs : true;
  return opensBeforeWindowEnds && closesAfterWindowStarts;
}

export interface BuildSeriesSummaryOptions {
  windowCalendarDays: number;
  percentileMinObservations?: { thirtyDay: number; ninetyDay: number };
}

export interface SeriesSummaryResult {
  summary: SeriesSummary;
  missingDates: string[];
}

export async function buildSeriesSummary(
  definition: KalshiSeriesDefinition,
  options: BuildSeriesSummaryOptions,
): Promise<SeriesSummaryResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - options.windowCalendarDays * 24 * 60 * 60 * 1000);
  const windowStartMs = windowStart.getTime();
  const windowEndMs = now.getTime();
  const startTs = Math.floor(windowStartMs / 1000);
  const endTs = Math.floor(windowEndMs / 1000);

  const [liveMarkets, historicalMarkets] = await Promise.all([
    fetchLiveSeriesMarkets(definition.ticker),
    fetchHistoricalSeriesMarkets(definition.ticker),
  ]);

  const allMarkets = dedupeMarkets([...liveMarkets, ...historicalMarkets]);
  const activeMarkets = allMarkets
    .filter((m) => overlapsWindow(m, windowStartMs, windowEndMs))
    .slice(0, MAX_MARKETS_PER_SERIES);

  const warnings: string[] = [];

  if (activeMarkets.length === 0) {
    return {
      summary: {
        ticker: definition.ticker,
        macroDomain: definition.macroDomain,
        tier: definition.tier,
        status: "no_active_markets",
        latestDate: null,
        latestDeltaVw: null,
        latestAbsSignal: null,
        percentile30d: null,
        percentile90d: null,
        marketCount: null,
        totalWeight: null,
        history: [],
        warnings: [`No markets found for ${definition.ticker} overlapping the data window.`],
      },
      missingDates: [],
    };
  }

  const candlesByTicker = await fetchManyMarketCandlesticks(
    definition.ticker,
    activeMarkets.map((m) => m.ticker),
    startTs,
    endTs,
  );

  // Build per-market chronological candle series, keyed by UTC date.
  const perMarketByDate = new Map<string, Map<string, KalshiCandlestick>>();
  for (const [ticker, candles] of candlesByTicker) {
    const byDate = new Map<string, KalshiCandlestick>();
    for (const c of candles) byDate.set(c.dateUtc, c);
    perMarketByDate.set(ticker, byDate);
  }

  if ([...candlesByTicker.values()].every((c) => c.length === 0)) {
    warnings.push(`No candlestick data returned for any ${definition.ticker} market in the window.`);
  }

  const weekdayDates = weekdayDateRangeUtc(windowStart, now);
  const history: SeriesHistoryPoint[] = [];
  const missingDates: string[] = [];

  for (let i = 1; i < weekdayDates.length; i += 1) {
    const date = weekdayDates[i] as string;
    const prevDate = weekdayDates[i - 1] as string;

    const observations: MarketDailyObservation[] = [];
    for (const ticker of activeMarkets.map((m) => m.ticker)) {
      const byDate = perMarketByDate.get(ticker);
      if (!byDate) continue;
      const curr = byDate.get(date);
      const prev = byDate.get(prevDate);
      if (!curr || !prev) continue;
      if (curr.closeDollars === null || prev.closeDollars === null) continue;

      const weight = approximateDollarVolume(curr.volumeFp, curr.meanDollars, curr.closeDollars);
      if (weight === null) continue;

      observations.push({
        ticker,
        weight,
        previousClose: prev.closeDollars,
        currentClose: curr.closeDollars,
      });
    }

    const result = computeDeltaVw(observations);
    if (result.deltaVw === null) {
      missingDates.push(date);
      continue;
    }

    history.push({
      date,
      deltaVw: roundOrNull(result.deltaVw),
      absSignal: roundOrNull(result.absSignal),
      weight: roundOrNull(result.totalWeight, 2),
      marketCount: result.marketCount,
    });
  }

  if (history.length === 0) {
    return {
      summary: {
        ticker: definition.ticker,
        macroDomain: definition.macroDomain,
        tier: definition.tier,
        status: "insufficient_data",
        latestDate: null,
        latestDeltaVw: null,
        latestAbsSignal: null,
        percentile30d: null,
        percentile90d: null,
        marketCount: null,
        totalWeight: null,
        history: [],
        warnings: [...warnings, `Markets exist for ${definition.ticker} but no aligned daily signal could be computed.`],
      },
      missingDates,
    };
  }

  const thirtyMin = options.percentileMinObservations?.thirtyDay ?? 30;
  const ninetyMin = options.percentileMinObservations?.ninetyDay ?? 30;

  const last30 = history.slice(-30).map((h) => h.absSignal);
  const last90 = history.slice(-90).map((h) => h.absSignal);

  const p30 = computeTrailingPercentile(last30, Math.min(thirtyMin, 30));
  const p90 = computeTrailingPercentile(last90, Math.min(ninetyMin, 90));

  const latest = history[history.length - 1] as SeriesHistoryPoint;

  return {
    summary: {
      ticker: definition.ticker,
      macroDomain: definition.macroDomain,
      tier: definition.tier,
      status: "valid",
      latestDate: latest.date,
      latestDeltaVw: latest.deltaVw,
      latestAbsSignal: latest.absSignal,
      percentile30d: p30.percentile,
      percentile90d: p90.percentile,
      marketCount: latest.marketCount,
      totalWeight: latest.weight,
      history,
      warnings,
    },
    missingDates,
  };
}
