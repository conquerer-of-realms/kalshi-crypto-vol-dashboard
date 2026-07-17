import type { MethodologyContent } from "../src/lib/types.ts";

export function buildMethodology(): MethodologyContent {
  return {
    seriesAndAssets:
      "Eight primary Kalshi macro series (KXFED, KXCPI, KXCPICORE, KXGDP, KXU3, KXPCECORE, KXRECSSNBER, KXACPI) and six crypto assets (BTC, ETH, SOL, ADA, AVAX, LINK), matching the source paper. KXRATECUT and KXUSNFP are shown as experimental/insufficient because the paper excluded them from its primary analysis for lack of observations.",
    signalFormula:
      "delta_vw(s,t) = sum_j( V(j,t) * [p(j,t) - p(j,t-1)] ) / sum_j( V(j,t) ), where j ranges over active contracts in series s, p is the closing YES probability, and V is daily dollar volume (or approximation). abs_signal = |delta_vw|. fed_dovish(t) = -delta_vw(KXFED,t). In the UI, delta_vw and abs_signal are displayed in percentage points (pp) for readability (e.g. a raw value of 0.0125 is shown as 1.25 pp); chart tooltips and the generated JSON keep the raw decimal.",
    volatilityFormula:
      "r(a,t) = ln(P(a,t) / P(a,t-1)). RVol5(a,t) = sqrt(252) * sample_std_dev(r(t-4)..r(t)), sample standard deviation with n-1. The 20-day average is the trailing mean of the last 20 valid RVol5 values.",
    dataAlignment:
      "All timestamps are converted to UTC internally. Kalshi observations are matched to UTC calendar dates from candlestick end-of-period timestamps; crypto observations use UTC daily closes. Weekend Kalshi dates are excluded from the signal history because Kalshi macro markets trade on U.S. business days. Missing days are never forward-filled or zero-filled; they are recorded explicitly rather than fabricated. Each series is also classified by how current its own latest observation is: Fresh (within 3 business days), Stale (4-14 calendar days old), or Dormant (more than 14 calendar days old). A stale or dormant matched series can never register as an elevated ('Watch' or 'Active') signal on an asset card, regardless of its last-known percentile.",
    channelMapping:
      "Each crypto asset is mapped to the macro channel(s) the source paper identifies as most relevant to it (e.g. Bitcoin: Recession Risk and Fed-Dovish; Ethereum/Solana/Chainlink: CPI; Cardano: mixed CPI/monetary; Avalanche: no reliable signal). Labels such as 'OOS supported' or 'Strong but regime-sensitive' are taken directly from the paper's reported significance and regime-dependence, not recomputed by this dashboard.",
    forecastDisclaimer:
      "The source paper forecasts *future* five-day realized volatility using data not yet public at forecast time. This public dashboard only ever displays already-observed (trailing) realized volatility, current price, and how today's Kalshi signal compares to its own trailing history. It does not run the paper's regression models live and does not fabricate a numeric forecast of future volatility.",
    volumeApproximation:
      "Kalshi's public API does not expose a single direct dollar-volume field on candlesticks. Dollar volume is approximated as volume_fp * price.mean_dollars for that market/day, falling back to volume_fp * price.close_dollars if the mean price is unavailable. A market/day is excluded from the weighted signal entirely if both prices are missing or non-positive.",
    limitations: [
      "Regime dependence: the paper shows the Fed-dovish/Bitcoin channel is strongest during active rate-repricing cycles and may not generalize to calm periods.",
      "API coverage changes: Kalshi series list, ticker names, and available fields can change; this dashboard uses the current public API and may need updates if schemas change.",
      "Thin markets: some series have low daily volume, making the volume-weighted signal noisy or, on some days, uncomputable.",
      "Missing or settled market data: contracts expire and roll; some days have no active market for a series, which is shown as missing rather than zero.",
      "Historical statistical relationships documented in the paper may not persist going forward.",
      "The paper's reported direction for a channel (e.g. 'Lower expected volatility') is a historical, average finding, not a live forecast. Each asset card separately shows a current signal-activity tier -- No elevated signal, Watch, or Active signal -- based on today's percentile and the matched series' own freshness, so the historical relationship is never presented as though it is actively firing right now.",
      "This dashboard is a research and educational tool. It is not investment advice and does not recommend any trade or position.",
    ],
  };
}
