// Presentation-only text for the simplified asset card: a friendly channel
// name and a one-sentence plain-English historical interpretation, keyed by
// asset symbol + matched series ticker. Purely additive display copy -- it
// does not affect paperData.ts, the generated dashboard JSON, or any
// calculation/threshold.

import type { AssetSummary } from "./types.ts";

const DEFAULT_FRIENDLY_NAME: Record<string, string> = {
  KXFED: "Fed policy",
  KXCPI: "CPI inflation",
  KXCPICORE: "Core CPI inflation",
  KXGDP: "GDP growth",
  KXU3: "Unemployment rate",
  KXPCECORE: "Core PCE inflation",
  KXRECSSNBER: "Recession risk",
  KXACPI: "CPI level outcome",
  KXRATECUT: "Rate cut odds",
  KXUSNFP: "Non-farm payrolls",
};

const FRIENDLY_NAME_OVERRIDES: Record<string, string> = {
  "BTC:KXFED": "Fed-dovish",
};

const HISTORICAL_RELATIONSHIP: Record<string, string> = {
  "BTC:KXRECSSNBER":
    "Large recession-risk repricing has historically preceded lower BTC volatility over the following five days.",
  "BTC:KXFED":
    "Large dovish Fed repricing has historically preceded higher BTC volatility, mainly during active rate-repricing cycles.",
  "ETH:KXCPI": "Large CPI repricing has historically preceded lower ETH volatility over the following five days.",
  "SOL:KXCPI": "Large CPI repricing has historically preceded lower SOL volatility over the following five days.",
  "LINK:KXCPI": "Large CPI repricing has historically preceded lower LINK volatility over the following five days.",
  "ADA:KXCPI":
    "Historical evidence for CPI repricing and ADA volatility is mixed, with no single reliable direction.",
  "ADA:KXFED":
    "Historical evidence for Fed repricing and ADA volatility is mixed, with no single reliable direction.",
};

/** Human-readable channel name for the "Matched channel" line. */
export function friendlyChannelName(symbol: string, seriesTicker: string): string {
  return FRIENDLY_NAME_OVERRIDES[`${symbol}:${seriesTicker}`] ?? DEFAULT_FRIENDLY_NAME[seriesTicker] ?? seriesTicker;
}

/** One short plain-English sentence for the "Historical relationship" line. */
export function historicalRelationshipFor(asset: AssetSummary): string {
  if (asset.paperDirection === "no_signal" || !asset.primaryChannelTicker) {
    return `The research did not identify a dependable Kalshi volatility channel for ${asset.symbol}.`;
  }
  const key = `${asset.symbol}:${asset.primaryChannelTicker}`;
  return HISTORICAL_RELATIONSHIP[key] ?? "Historical evidence is mixed and does not point to a single reliable direction.";
}
