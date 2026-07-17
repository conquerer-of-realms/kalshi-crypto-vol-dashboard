// Orchestrates crypto price fetching (Coinbase primary, Binance fallback)
// and the return / realized-volatility calculations into an AssetSummary.

import { fetchDailyCandles, validateCoinbaseProduct, type DailyCandle } from "./api/coinbase.ts";
import { fetchDailyKlines } from "./api/binance.ts";
import { logReturn, realizedVolatility, trailingAverage } from "./calculations/volatility.ts";
import { ASSET_CHANNELS, paperDirectionFor, evidenceBadgeFor, type CryptoAssetDefinition } from "../src/lib/paperData.ts";
import type { AssetSummary, CryptoSource, RVolHistoryPoint } from "../src/lib/types.ts";
import { roundOrNull } from "./util.ts";

const MIN_CANDLES_TARGET = 220;
const MIN_CANDLES_FOR_ANY_SIGNAL = 10;

export interface AssetSummaryResult {
  summary: AssetSummary;
  missingDates: string[];
}

async function fetchCandlesWithFallback(
  asset: CryptoAssetDefinition,
): Promise<{ candles: DailyCandle[]; source: CryptoSource; productId: string; warnings: string[] }> {
  const warnings: string[] = [];

  const coinbaseValid = await validateCoinbaseProduct(asset.coinbaseProductId).catch(() => false);
  if (coinbaseValid) {
    try {
      const candles = await fetchDailyCandles(asset.coinbaseProductId, MIN_CANDLES_TARGET);
      if (candles.length >= MIN_CANDLES_FOR_ANY_SIGNAL) {
        return { candles, source: "coinbase", productId: asset.coinbaseProductId, warnings };
      }
      warnings.push(`Coinbase returned only ${candles.length} candles for ${asset.coinbaseProductId}; trying Binance fallback.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      warnings.push(`Coinbase candle fetch failed for ${asset.coinbaseProductId}: ${message}`);
    }
  } else {
    warnings.push(`Coinbase product ${asset.coinbaseProductId} unavailable; using Binance fallback.`);
  }

  const binanceCandles = await fetchDailyKlines(asset.binanceSymbol, MIN_CANDLES_TARGET);
  return { candles: binanceCandles, source: "binance", productId: asset.binanceSymbol, warnings };
}

export async function buildAssetSummary(asset: CryptoAssetDefinition): Promise<AssetSummaryResult> {
  const { candles, source, productId, warnings } = await fetchCandlesWithFallback(asset);

  const channels = ASSET_CHANNELS[asset.symbol] ?? [];
  const primaryChannelTicker = channels[0]?.seriesTicker ?? null;
  const paperDirection = paperDirectionFor(asset.symbol);
  const evidenceBadge = evidenceBadgeFor(asset.symbol);

  if (candles.length < MIN_CANDLES_FOR_ANY_SIGNAL) {
    return {
      summary: {
        symbol: asset.symbol,
        name: asset.name,
        source,
        productId,
        status: "insufficient_data",
        latestDate: null,
        price: null,
        return1d: null,
        rvol5: null,
        rvol20Avg: null,
        rvolChangeVs20dAvg: null,
        channels,
        primaryChannelTicker,
        primaryChannelLatestAbsSignal: null,
        signalPercentile90d: null,
        paperDirection,
        evidenceBadge,
        history: [],
        warnings: [...warnings, `Only ${candles.length} daily candles available for ${asset.symbol}; cannot compute returns.`],
      },
      missingDates: [],
    };
  }

  // Only consecutive available daily closes may be used for return calculations.
  const returns: Array<{ date: string; price: number; ret: number | null }> = candles.map((c, i) => {
    const prev = i > 0 ? candles[i - 1] : undefined;
    const ret = prev ? logReturn(prev.close, c.close) : null;
    return { date: c.dateUtc, price: c.close, ret };
  });

  const history: RVolHistoryPoint[] = [];
  const rvol5Series: Array<number | null> = [];

  for (let i = 0; i < returns.length; i += 1) {
    if (i < 4) {
      rvol5Series.push(null);
      continue;
    }
    const windowReturns = [
      returns[i - 4]?.ret,
      returns[i - 3]?.ret,
      returns[i - 2]?.ret,
      returns[i - 1]?.ret,
      returns[i]?.ret,
    ];
    const rvol5 = realizedVolatility(windowReturns, 5);
    rvol5Series.push(rvol5);
  }

  for (let i = 0; i < returns.length; i += 1) {
    const rvol20Avg = trailingAverage(rvol5Series.slice(0, i + 1), 20);
    const entry = returns[i];
    if (!entry) continue;
    const rvol5 = rvol5Series[i] ?? null;
    if (rvol5 === null && rvol20Avg === null) continue;
    history.push({
      date: entry.date,
      rvol5: roundOrNull(rvol5, 6),
      rvol20Avg: roundOrNull(rvol20Avg, 6),
    });
  }

  const lastIndex = returns.length - 1;
  const lastEntry = returns[lastIndex] as { date: string; price: number; ret: number | null };
  const latestRvol5 = rvol5Series[lastIndex] ?? null;
  const latestRvol20Avg = trailingAverage(rvol5Series, 20);
  const rvolChangeVs20dAvg =
    latestRvol5 !== null && latestRvol20Avg !== null ? latestRvol5 - latestRvol20Avg : null;

  const status: AssetSummary["status"] = latestRvol5 !== null ? "valid" : "insufficient_data";
  if (status === "insufficient_data") {
    warnings.push(`Fewer than 5 consecutive daily closes available near the latest date for ${asset.symbol}; realized volatility not computed.`);
  }

  return {
    summary: {
      symbol: asset.symbol,
      name: asset.name,
      source,
      productId,
      status,
      latestDate: lastEntry.date,
      price: roundOrNull(lastEntry.price, 6),
      return1d: roundOrNull(lastEntry.ret, 6),
      rvol5: roundOrNull(latestRvol5, 6),
      rvol20Avg: roundOrNull(latestRvol20Avg, 6),
      rvolChangeVs20dAvg: roundOrNull(rvolChangeVs20dAvg, 6),
      channels,
      primaryChannelTicker,
      primaryChannelLatestAbsSignal: null,
      signalPercentile90d: null,
      paperDirection,
      evidenceBadge,
      history,
      warnings,
    },
    missingDates: [],
  };
}
