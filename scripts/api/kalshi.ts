// Thin client for Kalshi's public, unauthenticated trade API v2.
// Base URL and endpoints per https://docs.kalshi.com (verified July 2026).
//
// All price/volume fields on the current API use string-encoded decimal
// ("_dollars") or fixed-point ("_fp") representations; this module parses
// them into finite numbers or null (never NaN/undefined).

import { fetchJson, mapWithConcurrency } from "./httpClient.ts";
import { utcDateFromUnixSeconds } from "../util.ts";

export const KALSHI_BASE_URL = "https://external-api.kalshi.com/trade-api/v2";

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface KalshiMarket {
  ticker: string;
  seriesTicker: string;
  eventTicker: string | null;
  status: string | null;
  openTime: string | null;
  closeTime: string | null;
  settlementTs: number | null;
}

interface RawKalshiMarket {
  ticker?: string;
  // NOTE: verified live (Jul 2026) -- neither /markets nor /historical/markets
  // actually echo series_ticker back on individual market objects, even
  // though it's a valid filter param. We already know it since we queried
  // for it, so it's injected by the caller rather than read here.
  event_ticker?: string;
  status?: string;
  open_time?: string;
  close_time?: string;
  // Also verified live: settlement_ts is an ISO-8601 string, not epoch seconds.
  settlement_ts?: string | null;
}

function normalizeMarket(raw: RawKalshiMarket, seriesTicker: string): KalshiMarket | null {
  if (!raw.ticker) return null;
  const settlementMs = raw.settlement_ts ? Date.parse(raw.settlement_ts) : NaN;
  return {
    ticker: raw.ticker,
    seriesTicker,
    eventTicker: raw.event_ticker ?? null,
    status: raw.status ?? null,
    openTime: raw.open_time ?? null,
    closeTime: raw.close_time ?? null,
    settlementTs: Number.isFinite(settlementMs) ? Math.floor(settlementMs / 1000) : null,
  };
}

interface MarketsPage {
  markets?: RawKalshiMarket[];
  cursor?: string | null;
}

async function paginateMarkets(
  path: string,
  seriesTicker: string,
  extraParams: Record<string, string> = {},
): Promise<KalshiMarket[]> {
  const markets: KalshiMarket[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 200; page += 1) {
    const params = new URLSearchParams({
      series_ticker: seriesTicker,
      limit: "1000",
      ...extraParams,
    });
    if (cursor) params.set("cursor", cursor);

    const url = `${KALSHI_BASE_URL}${path}?${params.toString()}`;
    const json: MarketsPage = await fetchJson(url, { context: `${path} ${seriesTicker}` });
    const pageMarkets = (json.markets ?? [])
      .map((m) => normalizeMarket(m, seriesTicker))
      .filter((m): m is KalshiMarket => m !== null);
    markets.push(...pageMarkets);

    cursor = json.cursor ?? null;
    if (!cursor || pageMarkets.length === 0) break;
  }

  return markets;
}

/** Fetches all currently-listed markets (any status) for a series, paginated. */
export async function fetchLiveSeriesMarkets(seriesTicker: string): Promise<KalshiMarket[]> {
  // mve_filter is accepted (and useful, to exclude multivariate-event noise)
  // on /markets, but is rejected as "mutually exclusive" with series_ticker
  // on /historical/markets (verified live) -- so it's only applied here.
  return paginateMarkets("/markets", seriesTicker, { mve_filter: "exclude" });
}

/** Fetches archived/settled markets (post historical cutoff) for a series, paginated. */
export async function fetchHistoricalSeriesMarkets(seriesTicker: string): Promise<KalshiMarket[]> {
  try {
    return await paginateMarkets("/historical/markets", seriesTicker);
  } catch {
    // Historical archive endpoint may 404/return nothing for series with no archived markets.
    return [];
  }
}

export interface HistoricalCutoff {
  marketSettledTs: number | null;
}

export async function fetchHistoricalCutoff(): Promise<HistoricalCutoff> {
  try {
    const json = await fetchJson<{ market_settled_ts?: number | string }>(`${KALSHI_BASE_URL}/historical/cutoff`, {
      context: "/historical/cutoff",
      maxRetries: 2,
    });
    return { marketSettledTs: parseNumeric(json.market_settled_ts) };
  } catch {
    return { marketSettledTs: null };
  }
}

export interface KalshiCandlestick {
  dateUtc: string;
  endPeriodTs: number;
  closeDollars: number | null;
  meanDollars: number | null;
  volumeFp: number | null;
}

// Verified live (Jul 2026): the *current* single-market and batch
// candlesticks endpoints use "_dollars"/"_fp" suffixed field names, but the
// */historical/* archive candlesticks endpoint uses the same values under
// unsuffixed names (close/mean/volume/open_interest). Both are handled.
interface RawPriceBlock {
  open_dollars?: string | number | null;
  close_dollars?: string | number | null;
  mean_dollars?: string | number | null;
  open?: string | number | null;
  close?: string | number | null;
  mean?: string | number | null;
}

interface RawCandlestick {
  end_period_ts?: number;
  price?: RawPriceBlock | null;
  volume_fp?: string | number | null;
  volume?: string | number | null;
}

function normalizeCandlestick(raw: RawCandlestick): KalshiCandlestick | null {
  if (raw.end_period_ts === undefined || raw.end_period_ts === null) return null;
  return {
    dateUtc: utcDateFromUnixSeconds(raw.end_period_ts),
    endPeriodTs: raw.end_period_ts,
    closeDollars: parseNumeric(raw.price?.close_dollars ?? raw.price?.close),
    meanDollars: parseNumeric(raw.price?.mean_dollars ?? raw.price?.mean),
    volumeFp: parseNumeric(raw.volume_fp ?? raw.volume),
  };
}

function extractCandlestickArray(json: unknown): RawCandlestick[] {
  if (Array.isArray(json)) return json as RawCandlestick[];
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.candlesticks)) return obj.candlesticks as RawCandlestick[];
    if (Array.isArray(obj.market_candlesticks)) return obj.market_candlesticks as RawCandlestick[];
  }
  return [];
}

const DAILY_PERIOD_INTERVAL = 1440;

/** Daily candlesticks for a single currently-listed market. */
export async function fetchLiveMarketCandlesticks(
  seriesTicker: string,
  ticker: string,
  startTs: number,
  endTs: number,
): Promise<KalshiCandlestick[]> {
  const params = new URLSearchParams({
    start_ts: String(startTs),
    end_ts: String(endTs),
    period_interval: String(DAILY_PERIOD_INTERVAL),
  });
  const url = `${KALSHI_BASE_URL}/series/${encodeURIComponent(seriesTicker)}/markets/${encodeURIComponent(ticker)}/candlesticks?${params.toString()}`;
  const json = await fetchJson<unknown>(url, { context: `candlesticks ${ticker}` });
  return extractCandlestickArray(json).map(normalizeCandlestick).filter((c): c is KalshiCandlestick => c !== null);
}

/** Daily candlesticks for a market archived under the historical cutoff. */
export async function fetchHistoricalMarketCandlesticks(
  ticker: string,
  startTs: number,
  endTs: number,
): Promise<KalshiCandlestick[]> {
  const params = new URLSearchParams({
    start_ts: String(startTs),
    end_ts: String(endTs),
    period_interval: String(DAILY_PERIOD_INTERVAL),
  });
  const url = `${KALSHI_BASE_URL}/historical/markets/${encodeURIComponent(ticker)}/candlesticks?${params.toString()}`;
  const json = await fetchJson<unknown>(url, { context: `historical candlesticks ${ticker}` });
  return extractCandlestickArray(json).map(normalizeCandlestick).filter((c): c is KalshiCandlestick => c !== null);
}

/**
 * Fetches daily candlesticks for a market, trying the live endpoint first
 * and falling back to the historical archive endpoint (per spec: markets
 * settled before the historical cutoff live only under `/historical/*`).
 */
export async function fetchMarketCandlesticksWithFallback(
  seriesTicker: string,
  ticker: string,
  startTs: number,
  endTs: number,
): Promise<KalshiCandlestick[]> {
  try {
    const live = await fetchLiveMarketCandlesticks(seriesTicker, ticker, startTs, endTs);
    if (live.length > 0) return live;
  } catch {
    // fall through to historical
  }
  try {
    return await fetchHistoricalMarketCandlesticks(ticker, startTs, endTs);
  } catch {
    return [];
  }
}

interface RawBatchEntry {
  market_ticker?: string;
  candlesticks?: RawCandlestick[];
}

// Verified live (Jul 2026): GET /markets/candlesticks responds with
// {"markets": [{"market_ticker": "...", "candlesticks": [...]}, ...]}.
function extractBatchEntries(json: unknown): RawBatchEntry[] | null {
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.markets)) return obj.markets as RawBatchEntry[];
  }
  return null;
}

/**
 * Best-effort batch fetch via `/markets/candlesticks` (spec: "Use batch
 * candlesticks for live markets when possible"). Returns null if the
 * endpoint fails or its response shape is unrecognized, so the caller can
 * fall back to per-market requests without losing data.
 */
export async function fetchBatchLiveCandlesticks(
  tickers: ReadonlyArray<string>,
  startTs: number,
  endTs: number,
): Promise<Map<string, KalshiCandlestick[]> | null> {
  if (tickers.length === 0) return new Map();

  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += 100) chunks.push(tickers.slice(i, i + 100));

  const result = new Map<string, KalshiCandlestick[]>();
  try {
    for (const chunk of chunks) {
      const params = new URLSearchParams({
        market_tickers: chunk.join(","),
        start_ts: String(startTs),
        end_ts: String(endTs),
        period_interval: String(DAILY_PERIOD_INTERVAL),
      });
      const url = `${KALSHI_BASE_URL}/markets/candlesticks?${params.toString()}`;
      const json = await fetchJson<unknown>(url, { context: "batch candlesticks", maxRetries: 2 });
      const entries = extractBatchEntries(json);
      if (entries === null) return null;
      for (const entry of entries) {
        const ticker = entry.market_ticker;
        if (!ticker) continue;
        const candles = (entry.candlesticks ?? [])
          .map(normalizeCandlestick)
          .filter((c): c is KalshiCandlestick => c !== null);
        result.set(ticker, candles);
      }
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetches daily candlesticks for many markets: attempts the live batch
 * endpoint first, then fills in any ticker it didn't cover (or falls back
 * entirely on failure) via limited-concurrency per-market requests
 * (spec: "Limit concurrency for historical candlestick requests").
 */
export async function fetchManyMarketCandlesticks(
  seriesTicker: string,
  tickers: ReadonlyArray<string>,
  startTs: number,
  endTs: number,
  concurrency = 4,
): Promise<Map<string, KalshiCandlestick[]>> {
  const result = new Map<string, KalshiCandlestick[]>();

  const batch = await fetchBatchLiveCandlesticks(tickers, startTs, endTs);
  if (batch) {
    for (const [ticker, candles] of batch) {
      if (candles.length > 0) result.set(ticker, candles);
    }
  }

  const remaining = tickers.filter((t) => !result.has(t));
  await mapWithConcurrency(remaining, concurrency, async (ticker) => {
    const candles = await fetchMarketCandlesticksWithFallback(seriesTicker, ticker, startTs, endTs);
    result.set(ticker, candles);
  });

  return result;
}
