// Shared assembly helpers used by both the live data generator and the
// fixture generator, so demo data and live data are built the same way.

import type { AssetSummary, CryptoSource, DashboardData, SeriesSummary } from "../src/lib/types.ts";

export function computeSummary(series: SeriesSummary[], assets: AssetSummary[]): DashboardData["summary"] {
  const validSeries = series.filter((s) => s.status === "valid");
  const primaryValidSeries = validSeries.filter((s) => s.tier === "primary");
  const validAssets = assets.filter((a) => a.status === "valid");

  let largestKalshiSignal: DashboardData["summary"]["largestKalshiSignal"] = null;
  for (const s of primaryValidSeries) {
    if (s.latestAbsSignal === null) continue;
    if (!largestKalshiSignal || s.latestAbsSignal > largestKalshiSignal.absSignal) {
      largestKalshiSignal = { ticker: s.ticker, absSignal: s.latestAbsSignal };
    }
  }

  let mostElevatedCryptoRVol: DashboardData["summary"]["mostElevatedCryptoRVol"] = null;
  for (const a of validAssets) {
    if (a.rvol5 === null) continue;
    if (!mostElevatedCryptoRVol || a.rvol5 > mostElevatedCryptoRVol.rvol5) {
      mostElevatedCryptoRVol = { symbol: a.symbol, rvol5: a.rvol5 };
    }
  }

  let strongestPaperMatchedSignal: DashboardData["summary"]["strongestPaperMatchedSignal"] = null;
  for (const a of validAssets) {
    if (a.signalPercentile90d === null || a.primaryChannelTicker === null) continue;
    if (!strongestPaperMatchedSignal || a.signalPercentile90d > strongestPaperMatchedSignal.percentile) {
      strongestPaperMatchedSignal = {
        symbol: a.symbol,
        seriesTicker: a.primaryChannelTicker,
        percentile: a.signalPercentile90d,
      };
    }
  }

  return {
    largestKalshiSignal,
    mostElevatedCryptoRVol,
    strongestPaperMatchedSignal,
    validSeriesCount: validSeries.length,
    validAssetCount: validAssets.length,
  };
}

export function deriveStatus(
  summary: DashboardData["summary"],
  warningCount: number,
): DashboardData["status"] {
  if (summary.validSeriesCount === 0 || summary.validAssetCount === 0) return "error";
  if (warningCount > 0) return "partial";
  return "ok";
}

export function collectCryptoSources(assets: AssetSummary[]): Record<string, CryptoSource> {
  const cryptoSources: Record<string, CryptoSource> = {};
  for (const a of assets) cryptoSources[a.symbol] = a.source;
  return cryptoSources;
}

export function assertJsonSafe(value: unknown, path = "root"): void {
  if (value === undefined) {
    throw new Error(`Refusing to emit undefined value at ${path}`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`Refusing to emit non-finite number at ${path}: ${value}`);
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertJsonSafe(v, `${path}[${i}]`));
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) assertJsonSafe(v, `${path}.${k}`);
  }
}
