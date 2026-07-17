#!/usr/bin/env tsx
// Generates a small, clearly-labeled demo dataset (isFixtureData: true) so
// the UI has something valid to render before the first live data:update
// run. Uses the *same* calculation functions as the live pipeline (just fed
// synthetic prices) so the fixture numbers are internally consistent, and
// the *same* assembly helpers so its shape always matches the live output.
//
// Run with: npx tsx scripts/fixtures/generate-fixture.ts
// Output is overwritten by `npm run data:update` after a successful live run.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ASSET_CHANNELS, CRYPTO_ASSETS, KALSHI_SERIES, evidenceBadgeFor, paperDirectionFor } from "../../src/lib/paperData.ts";
import type {
  AssetSummary,
  DashboardData,
  RVolHistoryPoint,
  SeriesHistoryPoint,
  SeriesSummary,
} from "../../src/lib/types.ts";
import { computeDeltaVw } from "../calculations/kalshiSignal.ts";
import { computeTrailingPercentile } from "../calculations/percentile.ts";
import { logReturn, realizedVolatility, trailingAverage } from "../calculations/volatility.ts";
import { buildMethodology } from "../methodology.ts";
import { assertJsonSafe, collectCryptoSources, computeSummary, deriveStatus } from "../dashboardAssembly.ts";
import { roundOrNull, weekdayDateRangeUtc } from "../util.ts";

const METHOD_VERSION = "1.0.0";
const FIXTURE_DAYS = 45; // enough business days to clear the 30-obs percentile threshold
const WINDOW_CALENDAR_DAYS = 220;
const MIN_VALID_OBSERVATIONS = 90;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "..", "..", "public", "data", "dashboard.json");

/** Small deterministic PRNG (mulberry32) so the fixture is reproducible. */
function makeRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function businessDates(count: number): string[] {
  const end = new Date();
  const start = new Date(end.getTime() - count * 2.1 * 24 * 60 * 60 * 1000); // pad for weekends
  return weekdayDateRangeUtc(start, end).slice(-count);
}

function buildFixtureSeries(ticker: string, macroDomain: string, tier: "primary" | "experimental", seed: number, active: boolean): SeriesSummary {
  if (!active) {
    return {
      ticker,
      macroDomain,
      tier,
      status: "insufficient_data",
      latestDate: null,
      latestDeltaVw: null,
      latestAbsSignal: null,
      percentile30d: null,
      percentile90d: null,
      marketCount: null,
      totalWeight: null,
      history: [],
      warnings: [`Fixture data: ${ticker} has insufficient observations, matching the paper's own coverage note.`],
    };
  }

  const rng = makeRng(seed);
  const dates = businessDates(FIXTURE_DAYS + 1);
  let price = 0.3 + rng() * 0.4;
  const history: SeriesHistoryPoint[] = [];

  for (let i = 1; i < dates.length; i += 1) {
    const prevPrice = price;
    const step = (rng() - 0.5) * 0.08;
    price = Math.min(0.97, Math.max(0.03, price + step));
    const weight = 5_000 + rng() * 40_000;

    const result = computeDeltaVw([
      { ticker: `${ticker}-DEMO`, weight, previousClose: prevPrice, currentClose: price },
    ]);

    history.push({
      date: dates[i] as string,
      deltaVw: roundOrNull(result.deltaVw),
      absSignal: roundOrNull(result.absSignal),
      weight: roundOrNull(result.totalWeight, 2),
      marketCount: result.marketCount,
    });
  }

  const last30 = history.slice(-30).map((h) => h.absSignal);
  const last90 = history.slice(-90).map((h) => h.absSignal);
  const p30 = computeTrailingPercentile(last30, 30);
  const p90 = computeTrailingPercentile(last90, Math.min(30, 90));

  const latest = history[history.length - 1] as SeriesHistoryPoint;

  return {
    ticker,
    macroDomain,
    tier,
    status: "valid",
    latestDate: latest.date,
    latestDeltaVw: latest.deltaVw,
    latestAbsSignal: latest.absSignal,
    percentile30d: p30.percentile,
    percentile90d: p90.percentile,
    marketCount: latest.marketCount,
    totalWeight: latest.weight,
    history,
    warnings: [],
  };
}

function buildFixtureAsset(
  symbol: string,
  name: string,
  coinbaseProductId: string,
  seed: number,
  startPrice: number,
  channels: AssetSummary["channels"],
  paperDirection: AssetSummary["paperDirection"],
  evidenceBadge: string,
): AssetSummary {
  const rng = makeRng(seed);
  const dates = businessDates(FIXTURE_DAYS + 6);
  const prices: number[] = [startPrice];
  for (let i = 1; i < dates.length; i += 1) {
    const drift = (rng() - 0.5) * 0.06;
    const prev = prices[i - 1] as number;
    prices.push(Math.max(0.01, prev * (1 + drift)));
  }

  const returns: Array<number | null> = prices.map((p, i) => (i === 0 ? null : logReturn(prices[i - 1] as number, p)));

  const rvol5Series: Array<number | null> = returns.map((_, i) => {
    if (i < 4) return null;
    return realizedVolatility([returns[i - 4], returns[i - 3], returns[i - 2], returns[i - 1], returns[i]], 5);
  });

  const history: RVolHistoryPoint[] = dates
    .map((date, i) => ({
      date,
      rvol5: roundOrNull(rvol5Series[i] ?? null, 6),
      rvol20Avg: roundOrNull(trailingAverage(rvol5Series.slice(0, i + 1), 20), 6),
    }))
    .filter((h) => h.rvol5 !== null || h.rvol20Avg !== null);

  const lastIndex = dates.length - 1;
  const latestRvol5 = rvol5Series[lastIndex] ?? null;
  const latestRvol20Avg = trailingAverage(rvol5Series, 20);

  return {
    symbol,
    name,
    source: "coinbase",
    productId: coinbaseProductId,
    status: "valid",
    latestDate: dates[lastIndex] as string,
    price: roundOrNull(prices[lastIndex] as number, 6),
    return1d: roundOrNull(returns[lastIndex] ?? null, 6),
    rvol5: roundOrNull(latestRvol5, 6),
    rvol20Avg: roundOrNull(latestRvol20Avg, 6),
    rvolChangeVs20dAvg:
      latestRvol5 !== null && latestRvol20Avg !== null ? roundOrNull(latestRvol5 - latestRvol20Avg, 6) : null,
    channels,
    primaryChannelTicker: channels[0]?.seriesTicker ?? null,
    primaryChannelLatestAbsSignal: null,
    signalPercentile90d: null,
    paperDirection,
    evidenceBadge,
    history,
    warnings: [],
  };
}

async function main(): Promise<void> {
  const activeByTicker: Record<string, boolean> = {
    KXFED: true,
    KXCPI: true,
    KXCPICORE: true,
    KXGDP: true,
    KXU3: true,
    KXPCECORE: true,
    KXRECSSNBER: true,
    KXACPI: true,
    KXRATECUT: false,
    KXUSNFP: false,
  };

  const series = KALSHI_SERIES.map((def, i) =>
    buildFixtureSeries(def.ticker, def.macroDomain, def.tier, 1000 + i, activeByTicker[def.ticker] ?? true),
  );
  const seriesByTicker = new Map(series.map((s) => [s.ticker, s]));

  const startPrices: Record<string, number> = {
    BTC: 61000,
    ETH: 2600,
    SOL: 140,
    ADA: 0.45,
    AVAX: 22,
    LINK: 13,
  };

  const assets = CRYPTO_ASSETS.map((def, i) => {
    const channels = ASSET_CHANNELS[def.symbol] ?? [];
    const asset = buildFixtureAsset(
      def.symbol,
      def.name,
      def.coinbaseProductId,
      2000 + i,
      startPrices[def.symbol] ?? 100,
      channels,
      paperDirectionFor(def.symbol),
      evidenceBadgeFor(def.symbol),
    );
    const matched = asset.primaryChannelTicker ? seriesByTicker.get(asset.primaryChannelTicker) : undefined;
    return {
      ...asset,
      primaryChannelLatestAbsSignal: matched?.latestAbsSignal ?? null,
      signalPercentile90d: matched?.percentile90d ?? null,
    };
  });

  const summary = computeSummary(series, assets);
  const warnings = [
    "This is fixture/demo data for local development and first-load preview only. Run `npm run data:update` to fetch live data from Kalshi and Coinbase/Binance.",
  ];
  const status = deriveStatus(summary, warnings.length);

  const dashboard: DashboardData = {
    generatedAt: new Date().toISOString(),
    methodVersion: METHOD_VERSION,
    status,
    isFixtureData: true,
    sources: {
      kalshi: {
        baseUrl: "https://external-api.kalshi.com/trade-api/v2",
        volumeWeightMethod: "volume_fp_times_mean_price_fallback_close_price",
      },
      crypto: collectCryptoSources(assets),
    },
    summary,
    series,
    assets,
    warnings,
    methodology: buildMethodology(),
    dataWindow: {
      targetCalendarDays: WINDOW_CALENDAR_DAYS,
      minValidObservations: MIN_VALID_OBSERVATIONS,
      missingDates: {},
    },
  };

  assertJsonSafe(dashboard);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(dashboard, null, 2) + "\n", "utf-8");
  console.log(`[fixture] Wrote demo dashboard data to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("[fixture] Fatal error:", err);
  process.exitCode = 1;
});
