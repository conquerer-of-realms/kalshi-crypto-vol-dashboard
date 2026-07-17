// Shared HTTP helper: retries transient upstream failures with exponential
// backoff + jitter, sets a descriptive User-Agent, and never throws on a
// well-formed 4xx that just means "no data" (callers decide).

import { sleep } from "../util.ts";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export const USER_AGENT =
  "kalshi-crypto-vol-dashboard/1.0 (+https://github.com/) static-site-data-generator; contact via GitHub issues";

export interface FetchJsonOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  headers?: Record<string, string>;
  /** If provided, called with the parsed error body/status for diagnostics. */
  context?: string;
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { maxRetries = 5, baseDelayMs = 500, headers = {}, context } = options;

  let attempt = 0;
  while (true) {
    attempt += 1;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          ...headers,
        },
      });
    } catch (networkError) {
      if (attempt > maxRetries) {
        const message = networkError instanceof Error ? networkError.message : String(networkError);
        throw new Error(`Network error fetching ${context ?? url} after ${attempt} attempts: ${message}`, {
          cause: networkError,
        });
      }
      await backoff(attempt, baseDelayMs);
      continue;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (RETRYABLE_STATUS.has(response.status) && attempt <= maxRetries) {
      await backoff(attempt, baseDelayMs, response.headers.get("retry-after"));
      continue;
    }

    const bodyText = await response.text().catch(() => "");
    throw new HttpError(
      `Request failed (${response.status}) for ${context ?? url}: ${bodyText.slice(0, 300)}`,
      response.status,
    );
  }
}

async function backoff(attempt: number, baseDelayMs: number, retryAfterHeader?: string | null): Promise<void> {
  if (retryAfterHeader) {
    const retryAfterSeconds = Number(retryAfterHeader);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      await sleep(retryAfterSeconds * 1000);
      return;
    }
  }
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.random() * baseDelayMs;
  await sleep(Math.min(exponential + jitter, 15_000));
}

/** Simple concurrency-limited map, used to avoid hammering upstream APIs. */
export async function mapWithConcurrency<TItem, TResult>(
  items: ReadonlyArray<TItem>,
  concurrency: number,
  fn: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      const item = items[current] as TItem;
      results[current] = await fn(item, current);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => worker());
  await Promise.all(workers);
  return results;
}
