// Thin client for the Coinbase Exchange public market-data API.
// Base https://api.exchange.coinbase.com is unauthenticated for these
// endpoints (verified July 2026): GET /products/{id}, GET /products/{id}/candles.

import { fetchJson } from "./httpClient.ts";
import { utcDateFromUnixSeconds } from "../util.ts";

export const COINBASE_BASE_URL = "https://api.exchange.coinbase.com";

/** Max candles returned per request by the Coinbase Exchange API. */
const MAX_CANDLES_PER_REQUEST = 300;
const DAILY_GRANULARITY_SECONDS = 86400;

export interface DailyCandle {
  dateUtc: string;
  timeUnixSeconds: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface RawProduct {
  id?: string;
  status?: string;
}

export async function validateCoinbaseProduct(productId: string): Promise<boolean> {
  try {
    const product = await fetchJson<RawProduct>(`${COINBASE_BASE_URL}/products/${productId}`, {
      context: `product ${productId}`,
      maxRetries: 2,
    });
    return Boolean(product.id) && product.status !== "delisted";
  } catch {
    return false;
  }
}

// Coinbase candle rows are [time, low, high, open, close, volume] (low/high
// precede open/close -- verified against current API docs).
type RawCandleRow = [number, number, number, number, number, number];

function normalizeCandleRow(row: RawCandleRow): DailyCandle {
  const [time, low, high, open, close, volume] = row;
  return {
    dateUtc: utcDateFromUnixSeconds(time),
    timeUnixSeconds: time,
    open,
    high,
    low,
    close,
    volume,
  };
}

/**
 * Fetches at least `minCandles` most-recent daily candles for a product,
 * paginating backwards in time as needed since the API caps each response
 * at 300 candles.
 */
export async function fetchDailyCandles(productId: string, minCandles = 220): Promise<DailyCandle[]> {
  const all: DailyCandle[] = [];
  let end = new Date();

  for (let page = 0; page < 5 && all.length < minCandles; page += 1) {
    const start = new Date(end.getTime() - MAX_CANDLES_PER_REQUEST * DAILY_GRANULARITY_SECONDS * 1000);
    const params = new URLSearchParams({
      granularity: String(DAILY_GRANULARITY_SECONDS),
      start: start.toISOString(),
      end: end.toISOString(),
    });
    const url = `${COINBASE_BASE_URL}/products/${productId}/candles?${params.toString()}`;
    const rows = await fetchJson<RawCandleRow[]>(url, { context: `candles ${productId}` });
    if (!Array.isArray(rows) || rows.length === 0) break;

    const normalized = rows.map(normalizeCandleRow);
    all.push(...normalized);

    const oldestSeconds = Math.min(...normalized.map((c) => c.timeUnixSeconds));
    end = new Date(oldestSeconds * 1000);
  }

  const byDate = new Map<string, DailyCandle>();
  for (const candle of all) byDate.set(candle.dateUtc, candle);
  return Array.from(byDate.values()).sort((a, b) => a.timeUnixSeconds - b.timeUnixSeconds);
}
