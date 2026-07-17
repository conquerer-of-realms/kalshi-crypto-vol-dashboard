import { describe, expect, it } from "vitest";
import {
  computeLargestFreshKalshiSignal,
  computeSeriesFreshnessCounts,
  computeTopPaperMatchedChannel,
  getMatchedSeriesFreshness,
} from "../src/lib/deriveSummary.ts";
import type { AssetSummary, SeriesSummary } from "../src/lib/types.ts";

// Fixed reference "now": Wednesday 2026-07-15 (UTC) -- matches tests/seriesFreshness.test.ts's fixtures.
const NOW = new Date(Date.UTC(2026, 6, 15));
const FRESH_DATE = "2026-07-15"; // same day -> fresh
const STALE_DATE = "2026-07-09"; // 6 calendar / 4 business days -> stale
const DORMANT_DATE = "2026-01-14"; // far past -> dormant

function makeSeries(overrides: Partial<SeriesSummary>): SeriesSummary {
  return {
    ticker: "KXFED",
    macroDomain: "Monetary policy",
    tier: "primary",
    status: "valid",
    latestDate: FRESH_DATE,
    latestDeltaVw: 0.01,
    latestAbsSignal: 0.01,
    percentile30d: 50,
    percentile90d: 50,
    marketCount: 3,
    totalWeight: 1000,
    history: [],
    warnings: [],
    ...overrides,
  };
}

function makeAsset(overrides: Partial<AssetSummary>): AssetSummary {
  return {
    symbol: "BTC",
    name: "Bitcoin",
    source: "coinbase",
    productId: "BTC-USD",
    status: "valid",
    latestDate: "2026-07-15",
    price: 60000,
    return1d: 0.01,
    rvol5: 0.4,
    rvol20Avg: 0.35,
    rvolChangeVs20dAvg: 0.05,
    channels: [],
    primaryChannelTicker: "KXRECSSNBER",
    primaryChannelLatestAbsSignal: null,
    signalPercentile90d: 80,
    paperDirection: "lower",
    evidenceBadge: "OOS strongest",
    history: [],
    warnings: [],
    ...overrides,
  };
}

describe("computeSeriesFreshnessCounts", () => {
  it("buckets valid series by freshness and ignores series with no data date", () => {
    const series = [
      makeSeries({ ticker: "A", latestDate: FRESH_DATE }),
      makeSeries({ ticker: "B", latestDate: STALE_DATE }),
      makeSeries({ ticker: "C", latestDate: DORMANT_DATE }),
      makeSeries({ ticker: "D", latestDate: FRESH_DATE }),
      makeSeries({ ticker: "E", status: "no_active_markets", latestDate: null }),
    ];
    const counts = computeSeriesFreshnessCounts(series, NOW);
    expect(counts).toEqual({ current: 2, stale: 1, dormant: 1 });
  });
});

describe("computeLargestFreshKalshiSignal", () => {
  it("picks the largest abs_signal among fresh, primary-tier, valid series", () => {
    const series = [
      makeSeries({ ticker: "KXFED", latestAbsSignal: 0.05, latestDate: FRESH_DATE }),
      makeSeries({ ticker: "KXCPI", latestAbsSignal: 0.09, latestDate: FRESH_DATE }),
    ];
    expect(computeLargestFreshKalshiSignal(series, NOW)).toEqual({ ticker: "KXCPI", absSignal: 0.09 });
  });

  it("excludes stale/dormant series even if they have the largest raw signal", () => {
    const series = [
      makeSeries({ ticker: "KXFED", latestAbsSignal: 0.05, latestDate: FRESH_DATE }),
      makeSeries({ ticker: "KXCPI", latestAbsSignal: 0.99, latestDate: DORMANT_DATE }),
    ];
    expect(computeLargestFreshKalshiSignal(series, NOW)).toEqual({ ticker: "KXFED", absSignal: 0.05 });
  });

  it("excludes experimental-tier series", () => {
    const series = [
      makeSeries({ ticker: "KXRATECUT", tier: "experimental", latestAbsSignal: 0.99, latestDate: FRESH_DATE }),
    ];
    expect(computeLargestFreshKalshiSignal(series, NOW)).toBeNull();
  });

  it("returns null when nothing qualifies", () => {
    const series = [makeSeries({ ticker: "KXFED", latestDate: DORMANT_DATE })];
    expect(computeLargestFreshKalshiSignal(series, NOW)).toBeNull();
  });
});

describe("computeTopPaperMatchedChannel", () => {
  it("picks the highest elevated (>=70th pct) matched channel whose series is fresh", () => {
    const series = [makeSeries({ ticker: "KXRECSSNBER", latestDate: FRESH_DATE })];
    const assets = [
      makeAsset({ symbol: "BTC", primaryChannelTicker: "KXRECSSNBER", signalPercentile90d: 80 }),
      makeAsset({ symbol: "ETH", primaryChannelTicker: "KXCPI", signalPercentile90d: 95 }),
    ];
    // ETH's matched series (KXCPI) isn't in the series list at all -> excluded as "not fresh" (no match found)
    expect(computeTopPaperMatchedChannel(assets, series, NOW)).toEqual({
      symbol: "BTC",
      seriesTicker: "KXRECSSNBER",
      percentile: 80,
    });
  });

  it("excludes channels below the 70th percentile", () => {
    const series = [makeSeries({ ticker: "KXRECSSNBER", latestDate: FRESH_DATE })];
    const assets = [makeAsset({ symbol: "BTC", primaryChannelTicker: "KXRECSSNBER", signalPercentile90d: 69 })];
    expect(computeTopPaperMatchedChannel(assets, series, NOW)).toBeNull();
  });

  it("excludes an asset whose matched series is stale or dormant, even at a high percentile", () => {
    const series = [makeSeries({ ticker: "KXRECSSNBER", latestDate: DORMANT_DATE })];
    const assets = [makeAsset({ symbol: "BTC", primaryChannelTicker: "KXRECSSNBER", signalPercentile90d: 99 })];
    expect(computeTopPaperMatchedChannel(assets, series, NOW)).toBeNull();
  });

  it("excludes assets with no reliable channel at all (paperDirection 'no_signal')", () => {
    const series = [makeSeries({ ticker: "KXCPI", latestDate: FRESH_DATE })];
    const assets = [
      makeAsset({
        symbol: "AVAX",
        primaryChannelTicker: "KXCPI",
        signalPercentile90d: 99,
        paperDirection: "no_signal",
      }),
    ];
    expect(computeTopPaperMatchedChannel(assets, series, NOW)).toBeNull();
  });

  it("returns null when every eligible channel is below the threshold", () => {
    const series = [makeSeries({ ticker: "KXRECSSNBER", latestDate: FRESH_DATE })];
    const assets = [makeAsset({ symbol: "BTC", primaryChannelTicker: "KXRECSSNBER", signalPercentile90d: 40 })];
    expect(computeTopPaperMatchedChannel(assets, series, NOW)).toBeNull();
  });
});

describe("getMatchedSeriesFreshness", () => {
  it("returns the freshness of the asset's matched series", () => {
    const series = [makeSeries({ ticker: "KXRECSSNBER", latestDate: STALE_DATE })];
    const asset = makeAsset({ primaryChannelTicker: "KXRECSSNBER" });
    expect(getMatchedSeriesFreshness(asset, series, NOW)).toBe("stale");
  });

  it("returns null when the asset has no matched channel", () => {
    const asset = makeAsset({ primaryChannelTicker: null });
    expect(getMatchedSeriesFreshness(asset, [], NOW)).toBeNull();
  });

  it("returns null when the matched series ticker isn't found", () => {
    const asset = makeAsset({ primaryChannelTicker: "KXGHOST" });
    expect(getMatchedSeriesFreshness(asset, [makeSeries({ ticker: "KXFED" })], NOW)).toBeNull();
  });
});
