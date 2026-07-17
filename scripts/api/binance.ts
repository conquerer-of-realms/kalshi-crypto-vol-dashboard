// Thin client for Binance's public, market-data-only API (no API key
// required). Used as a fallback when a Coinbase product is unavailable.
// Base https://data-api.binance.vision (verified July 2026).

import { fetchJson } from "./httpClient.ts";
import type { DailyCandle } from "./coinbase.ts";

export const BINANCE_BASE_URL = "https://data-api.binance.vision";

// [openTime, open, high, low, close, volume, closeTime, quoteAssetVolume,
//  numTrades, takerBuyBaseVol, takerBuyQuoteVol, ignore] -- OHLCV values are
// strings, times are unix milliseconds.
type RawKline = [number, string, string, string, string, string, number, string, number, string, string, string];

function utcDateFromUnixMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function normalizeKline(row: RawKline): DailyCandle {
  const [openTime, open, high, low, close, volume] = row;
  return {
    dateUtc: utcDateFromUnixMs(openTime),
    timeUnixSeconds: Math.floor(openTime / 1000),
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  };
}

export async function fetchDailyKlines(symbol: string, minCandles = 220): Promise<DailyCandle[]> {
  const limit = Math.min(1000, Math.max(minCandles, 220));
  const params = new URLSearchParams({
    symbol,
    interval: "1d",
    limit: String(limit),
  });
  const url = `${BINANCE_BASE_URL}/api/v3/klines?${params.toString()}`;
  const rows = await fetchJson<RawKline[]>(url, { context: `klines ${symbol}` });
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeKline).sort((a, b) => a.timeUnixSeconds - b.timeUnixSeconds);
}
