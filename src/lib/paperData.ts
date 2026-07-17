// Static domain knowledge encoded from the source paper:
// "Do Prediction Markets Forecast Cryptocurrency Volatility? Evidence from
// Kalshi Macro Contracts" (Mohanty & Krishnamachari, 2026).
//
// Shared by the Node data-generation scripts and the browser UI so the
// series/asset/channel definitions have one source of truth.

import type { AssetChannel, CryptoSource, PaperDirection, SeriesTier } from "./types.ts";

export interface KalshiSeriesDefinition {
  ticker: string;
  macroDomain: string;
  tier: SeriesTier;
}

export const KALSHI_SERIES: KalshiSeriesDefinition[] = [
  { ticker: "KXFED", macroDomain: "Monetary policy / Fed rate level", tier: "primary" },
  { ticker: "KXCPI", macroDomain: "CPI inflation", tier: "primary" },
  { ticker: "KXCPICORE", macroDomain: "Core CPI inflation", tier: "primary" },
  { ticker: "KXGDP", macroDomain: "Real GDP growth", tier: "primary" },
  { ticker: "KXU3", macroDomain: "Unemployment rate", tier: "primary" },
  { ticker: "KXPCECORE", macroDomain: "Core PCE inflation", tier: "primary" },
  { ticker: "KXRECSSNBER", macroDomain: "NBER recession probability", tier: "primary" },
  { ticker: "KXACPI", macroDomain: "CPI level outcome", tier: "primary" },
  { ticker: "KXRATECUT", macroDomain: "Rate cut probability", tier: "experimental" },
  { ticker: "KXUSNFP", macroDomain: "Non-farm payrolls", tier: "experimental" },
];

export interface CryptoAssetDefinition {
  symbol: string;
  name: string;
  coinbaseProductId: string;
  binanceSymbol: string;
}

export const CRYPTO_ASSETS: CryptoAssetDefinition[] = [
  { symbol: "BTC", name: "Bitcoin", coinbaseProductId: "BTC-USD", binanceSymbol: "BTCUSDT" },
  { symbol: "ETH", name: "Ethereum", coinbaseProductId: "ETH-USD", binanceSymbol: "ETHUSDT" },
  { symbol: "SOL", name: "Solana", coinbaseProductId: "SOL-USD", binanceSymbol: "SOLUSDT" },
  { symbol: "ADA", name: "Cardano", coinbaseProductId: "ADA-USD", binanceSymbol: "ADAUSDT" },
  { symbol: "AVAX", name: "Avalanche", coinbaseProductId: "AVAX-USD", binanceSymbol: "AVAXUSDT" },
  { symbol: "LINK", name: "Chainlink", coinbaseProductId: "LINK-USD", binanceSymbol: "LINKUSDT" },
];

export const DEFAULT_CRYPTO_SOURCE: CryptoSource = "coinbase";

/** Paper-based channel mapping per Part 3 of the build spec. */
export const ASSET_CHANNELS: Record<string, AssetChannel[]> = {
  BTC: [
    {
      seriesTicker: "KXRECSSNBER",
      label: "OOS strongest",
      description:
        "Best out-of-sample evidence for Bitcoin in the paper. Larger recession-risk repricing was associated with lower next-week realized volatility (MSFE ratio 0.979, Clark-West p = 0.020).",
      direction: "lower",
      evidence: "oos_strongest",
    },
    {
      seriesTicker: "KXFED",
      label: "Strong but regime-sensitive",
      description:
        "Strongest in-sample Bitcoin result (t = 3.63, p < 0.001). Positive Fed-dovish repricing was associated with higher next-week volatility, but the effect is regime-dependent and concentrated in active rate-repricing cycles; it did not deliver out-of-sample gains over the full window.",
      direction: "higher",
      evidence: "strong_regime_sensitive",
    },
  ],
  ETH: [
    {
      seriesTicker: "KXCPI",
      label: "OOS supported",
      description:
        "Larger absolute CPI repricing was associated with lower next-week realized volatility. Significant out of sample (MSFE 0.959, p = 0.010).",
      direction: "lower",
      evidence: "oos_supported",
    },
  ],
  SOL: [
    {
      seriesTicker: "KXCPI",
      label: "OOS supported",
      description:
        "Larger absolute CPI repricing was associated with lower next-week realized volatility. Significant out of sample (MSFE 0.983, p = 0.048).",
      direction: "lower",
      evidence: "oos_supported",
    },
  ],
  ADA: [
    {
      seriesTicker: "KXCPI",
      label: "Mixed channel evidence",
      description:
        "KXCPI is the strongest in-sample inflation channel for Cardano, but the best reported out-of-sample specification is the monetary-policy signal. Evidence is mixed and should not be simplified into a single confident direction.",
      direction: "mixed",
      evidence: "mixed",
    },
    {
      seriesTicker: "KXFED",
      label: "Mixed channel evidence",
      description:
        "Best reported out-of-sample specification for Cardano (MSFE 0.992, p = 0.041), though the in-sample relationship is weaker than the CPI channel.",
      direction: "mixed",
      evidence: "mixed",
    },
  ],
  AVAX: [
    {
      seriesTicker: "KXCPI",
      label: "Weak / inconclusive evidence",
      description:
        "No reliable primary signal in the paper for Avalanche. The CPI coefficient is negative but insignificant (t = -1.31) and the model explains very little AVAX variance (adj. R^2 = 0.017). Price and realized volatility are still shown; no strong directional signal is generated.",
      direction: "no_signal",
      evidence: "weak_inconclusive",
    },
  ],
  LINK: [
    {
      seriesTicker: "KXCPI",
      label: "Strong in-sample; weaker OOS",
      description:
        "Strongest altcoin in-sample CPI relationship (t = -3.39, p = 0.001) and survives Benjamini-Hochberg multiple-testing correction. The out-of-sample gain was not statistically significant in the paper (p = 0.121).",
      direction: "lower",
      evidence: "strong_in_sample_weaker_oos",
    },
  ],
};

export function primaryChannelFor(symbol: string): AssetChannel | null {
  const channels = ASSET_CHANNELS[symbol];
  if (!channels || channels.length === 0) return null;
  return channels[0] ?? null;
}

export function paperDirectionFor(symbol: string): PaperDirection {
  const primary = primaryChannelFor(symbol);
  return primary ? primary.direction : "no_signal";
}

export function evidenceBadgeFor(symbol: string): string {
  const primary = primaryChannelFor(symbol);
  return primary ? primary.label : "No reliable signal";
}
