// Canonical typed contract for the generated dashboard JSON.
// This file has no runtime dependencies so it can be imported both by the
// Node data-generation scripts and by the browser-side React app.

export type OverallStatus = "ok" | "partial" | "error";

export type SeriesTier = "primary" | "experimental";

export type SeriesStatus =
  | "valid"
  | "no_active_markets"
  | "insufficient_data"
  | "api_error";

export type AssetStatus = "valid" | "insufficient_data" | "api_error";

export type PaperDirection = "higher" | "lower" | "mixed" | "no_signal";

export type CryptoSource = "coinbase" | "binance";

export interface SeriesHistoryPoint {
  date: string; // YYYY-MM-DD, UTC calendar date
  deltaVw: number | null;
  absSignal: number | null;
  weight: number | null;
  marketCount: number | null;
}

export interface SeriesSummary {
  ticker: string;
  macroDomain: string;
  tier: SeriesTier;
  status: SeriesStatus;
  latestDate: string | null;
  latestDeltaVw: number | null;
  latestAbsSignal: number | null;
  percentile30d: number | null;
  percentile90d: number | null;
  marketCount: number | null;
  totalWeight: number | null;
  history: SeriesHistoryPoint[];
  warnings: string[];
}

export interface AssetChannel {
  seriesTicker: string;
  label: string;
  description: string;
  direction: PaperDirection;
  evidence: string;
}

export interface RVolHistoryPoint {
  date: string;
  rvol5: number | null;
  rvol20Avg: number | null;
}

export interface AssetSummary {
  symbol: string;
  name: string;
  source: CryptoSource;
  productId: string;
  status: AssetStatus;
  latestDate: string | null;
  price: number | null;
  return1d: number | null;
  rvol5: number | null;
  rvol20Avg: number | null;
  rvolChangeVs20dAvg: number | null;
  channels: AssetChannel[];
  primaryChannelTicker: string | null;
  primaryChannelLatestAbsSignal: number | null;
  signalPercentile90d: number | null;
  paperDirection: PaperDirection;
  evidenceBadge: string;
  history: RVolHistoryPoint[];
  warnings: string[];
}

export interface SummaryLargestSignal {
  ticker: string;
  absSignal: number;
}

export interface SummaryElevatedVol {
  symbol: string;
  rvol5: number;
}

export interface SummaryStrongestMatch {
  symbol: string;
  seriesTicker: string;
  percentile: number;
}

export interface SummaryRow {
  largestKalshiSignal: SummaryLargestSignal | null;
  mostElevatedCryptoRVol: SummaryElevatedVol | null;
  strongestPaperMatchedSignal: SummaryStrongestMatch | null;
  validSeriesCount: number;
  validAssetCount: number;
}

export interface MethodologyContent {
  seriesAndAssets: string;
  signalFormula: string;
  volatilityFormula: string;
  dataAlignment: string;
  channelMapping: string;
  forecastDisclaimer: string;
  volumeApproximation: string;
  limitations: string[];
}

export interface DataWindowInfo {
  targetCalendarDays: number;
  minValidObservations: number;
  missingDates: Record<string, string[]>;
}

export interface DashboardData {
  generatedAt: string;
  methodVersion: string;
  status: OverallStatus;
  isFixtureData: boolean;
  sources: {
    kalshi: {
      baseUrl: string;
      volumeWeightMethod: string;
    };
    crypto: Record<string, CryptoSource>;
  };
  summary: SummaryRow;
  series: SeriesSummary[];
  assets: AssetSummary[];
  warnings: string[];
  methodology: MethodologyContent;
  dataWindow: DataWindowInfo;
}
