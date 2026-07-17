import { describe, expect, it } from "vitest";
import { assertJsonSafe, computeSummary, deriveStatus } from "../scripts/dashboardAssembly.ts";
import type { AssetSummary, SeriesSummary } from "../src/lib/types.ts";

function makeSeries(overrides: Partial<SeriesSummary>): SeriesSummary {
  return {
    ticker: "KXFED",
    macroDomain: "Monetary policy",
    tier: "primary",
    status: "valid",
    latestDate: "2026-01-01",
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
    latestDate: "2026-01-01",
    price: 60000,
    return1d: 0.01,
    rvol5: 0.4,
    rvol20Avg: 0.35,
    rvolChangeVs20dAvg: 0.05,
    channels: [],
    primaryChannelTicker: "KXRECSSNBER",
    primaryChannelLatestAbsSignal: null,
    signalPercentile90d: 60,
    paperDirection: "lower",
    evidenceBadge: "OOS strongest",
    history: [],
    warnings: [],
    ...overrides,
  };
}

describe("computeSummary", () => {
  it("only considers valid series/assets and picks the largest values", () => {
    const series = [
      makeSeries({ ticker: "KXFED", latestAbsSignal: 0.05 }),
      makeSeries({ ticker: "KXCPI", latestAbsSignal: 0.09 }),
      makeSeries({ ticker: "KXGDP", status: "no_active_markets", latestAbsSignal: null }),
    ];
    const assets = [
      makeAsset({ symbol: "BTC", rvol5: 0.4, signalPercentile90d: 60, primaryChannelTicker: "KXFED" }),
      makeAsset({ symbol: "ETH", rvol5: 0.7, signalPercentile90d: 80, primaryChannelTicker: "KXCPI" }),
      makeAsset({ symbol: "AVAX", status: "insufficient_data", rvol5: null }),
    ];

    const summary = computeSummary(series, assets);

    expect(summary.largestKalshiSignal).toEqual({ ticker: "KXCPI", absSignal: 0.09 });
    expect(summary.mostElevatedCryptoRVol).toEqual({ symbol: "ETH", rvol5: 0.7 });
    expect(summary.strongestPaperMatchedSignal).toEqual({ symbol: "ETH", seriesTicker: "KXCPI", percentile: 80 });
    expect(summary.validSeriesCount).toBe(2);
    expect(summary.validAssetCount).toBe(2);
  });

  it("never fabricates a leader when nothing is valid", () => {
    const summary = computeSummary(
      [makeSeries({ status: "api_error", latestAbsSignal: null })],
      [makeAsset({ status: "api_error", rvol5: null, signalPercentile90d: null })],
    );
    expect(summary.largestKalshiSignal).toBeNull();
    expect(summary.mostElevatedCryptoRVol).toBeNull();
    expect(summary.strongestPaperMatchedSignal).toBeNull();
    expect(summary.validSeriesCount).toBe(0);
    expect(summary.validAssetCount).toBe(0);
  });
});

describe("deriveStatus", () => {
  it("is 'error' when there are no valid series or no valid assets", () => {
    expect(deriveStatus({ validSeriesCount: 0, validAssetCount: 5 } as never, 0)).toBe("error");
    expect(deriveStatus({ validSeriesCount: 5, validAssetCount: 0 } as never, 0)).toBe("error");
  });

  it("is 'partial' when data exists but warnings were recorded", () => {
    expect(deriveStatus({ validSeriesCount: 5, validAssetCount: 5 } as never, 2)).toBe("partial");
  });

  it("is 'ok' when data exists and there are no warnings", () => {
    expect(deriveStatus({ validSeriesCount: 5, validAssetCount: 5 } as never, 0)).toBe("ok");
  });
});

describe("assertJsonSafe", () => {
  it("passes for finite numbers, null, and plain structures", () => {
    expect(() => assertJsonSafe({ a: 1, b: null, c: [1, 2, { d: 3 }] })).not.toThrow();
  });

  it("throws on NaN", () => {
    expect(() => assertJsonSafe({ a: NaN })).toThrow();
  });

  it("throws on Infinity", () => {
    expect(() => assertJsonSafe({ a: Infinity })).toThrow();
  });

  it("throws on undefined", () => {
    expect(() => assertJsonSafe({ a: undefined })).toThrow();
  });
});
