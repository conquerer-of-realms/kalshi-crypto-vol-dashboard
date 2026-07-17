#!/usr/bin/env tsx
// Entry point for `npm run data:update`.
//
// Fetches live data from Kalshi + Coinbase/Binance, computes the paper's
// signal and realized-volatility formulas, and writes the typed dashboard
// contract to public/data/dashboard.json. All upstream calls happen here
// (in CI or locally) -- the built website only ever reads this static file.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { KALSHI_SERIES, CRYPTO_ASSETS } from "../src/lib/paperData.ts";
import type { DashboardData, SeriesSummary, AssetSummary } from "../src/lib/types.ts";
import { buildSeriesSummary, type SeriesSummaryResult } from "./kalshiPipeline.ts";
import { buildAssetSummary, type AssetSummaryResult } from "./cryptoPipeline.ts";
import { KALSHI_BASE_URL } from "./api/kalshi.ts";
import { processIndependently } from "./util.ts";
import { buildMethodology } from "./methodology.ts";
import { assertJsonSafe, collectCryptoSources, computeSummary, deriveStatus } from "./dashboardAssembly.ts";

const METHOD_VERSION = "1.0.0";
const WINDOW_CALENDAR_DAYS = 220;
const MIN_VALID_OBSERVATIONS = 90;
const SERIES_CONCURRENCY = 3;
const ASSET_CONCURRENCY = 3;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "..", "public", "data", "dashboard.json");

async function main(): Promise<void> {
  console.log(`[data:update] Starting dashboard data generation (methodVersion ${METHOD_VERSION})`);
  const warnings: string[] = [];

  console.log(`[data:update] Fetching ${KALSHI_SERIES.length} Kalshi series (concurrency ${SERIES_CONCURRENCY})...`);
  const seriesOutcome = await processIndependently(
    KALSHI_SERIES,
    (def) =>
      buildSeriesSummary(def, {
        windowCalendarDays: WINDOW_CALENDAR_DAYS,
        percentileMinObservations: { thirtyDay: 30, ninetyDay: 30 },
      }),
    SERIES_CONCURRENCY,
  );

  const seriesResults: SeriesSummaryResult[] = seriesOutcome.successes.map((s) => s.result);
  for (const failure of seriesOutcome.failures) {
    const message = `Kalshi series ${failure.item.ticker} failed: ${failure.error}`;
    console.error(`[data:update] ${message}`);
    warnings.push(message);
  }

  console.log(`[data:update] Fetching ${CRYPTO_ASSETS.length} crypto assets (concurrency ${ASSET_CONCURRENCY})...`);
  const assetOutcome = await processIndependently(
    CRYPTO_ASSETS,
    (def) => buildAssetSummary(def),
    ASSET_CONCURRENCY,
  );

  const assetResults: AssetSummaryResult[] = assetOutcome.successes.map((a) => a.result);
  for (const failure of assetOutcome.failures) {
    const message = `Crypto asset ${failure.item.symbol} failed: ${failure.error}`;
    console.error(`[data:update] ${message}`);
    warnings.push(message);
  }

  const seriesByTicker = new Map(seriesResults.map((r) => [r.summary.ticker, r.summary]));

  // Cross-reference: an asset's signal percentile is its matched channel
  // series' own trailing-90 percentile of abs_signal.
  const assets: AssetSummary[] = assetResults.map((r) => {
    const matched = r.summary.primaryChannelTicker ? seriesByTicker.get(r.summary.primaryChannelTicker) : undefined;
    return {
      ...r.summary,
      primaryChannelLatestAbsSignal: matched?.latestAbsSignal ?? null,
      signalPercentile90d: matched?.percentile90d ?? null,
    };
  });

  const series: SeriesSummary[] = seriesResults.map((r) => r.summary);

  for (const r of seriesResults) warnings.push(...r.summary.warnings);
  for (const r of assetResults) warnings.push(...r.summary.warnings);

  const missingDates: Record<string, string[]> = {};
  for (const r of seriesResults) {
    if (r.missingDates.length > 0) missingDates[r.summary.ticker] = r.missingDates;
  }
  for (const r of assetResults) {
    if (r.missingDates.length > 0) missingDates[r.summary.symbol] = r.missingDates;
  }

  const summary = computeSummary(series, assets);
  const status = deriveStatus(summary, warnings.length);
  const cryptoSources = collectCryptoSources(assets);

  const dashboard: DashboardData = {
    generatedAt: new Date().toISOString(),
    methodVersion: METHOD_VERSION,
    status,
    isFixtureData: false,
    sources: {
      kalshi: {
        baseUrl: KALSHI_BASE_URL,
        volumeWeightMethod: "volume_fp_times_mean_price_fallback_close_price",
      },
      crypto: cryptoSources,
    },
    summary,
    series,
    assets,
    warnings,
    methodology: buildMethodology(),
    dataWindow: {
      targetCalendarDays: WINDOW_CALENDAR_DAYS,
      minValidObservations: MIN_VALID_OBSERVATIONS,
      missingDates,
    },
  };

  assertJsonSafe(dashboard);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(dashboard, null, 2) + "\n", "utf-8");

  console.log(`[data:update] Wrote ${OUTPUT_PATH}`);
  console.log(
    `[data:update] status=${status} validSeries=${summary.validSeriesCount}/${KALSHI_SERIES.length} validAssets=${summary.validAssetCount}/${CRYPTO_ASSETS.length} warnings=${warnings.length}`,
  );

  if (status === "error") {
    console.error(
      "[data:update] FAILING BUILD: no valid Kalshi series or no valid crypto assets were produced. Refusing to treat this as a successful update.",
    );
    process.exitCode = 1;
    return;
  }
}

main().catch((err) => {
  console.error("[data:update] Fatal error:", err);
  process.exitCode = 1;
});
