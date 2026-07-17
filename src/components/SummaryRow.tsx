import type { SummaryRow as SummaryRowData } from "../lib/types.ts";
import { formatOrdinal, formatPercent, formatSignal } from "../lib/format.ts";

interface SummaryRowProps {
  summary: SummaryRowData;
  totalSeries: number;
  totalAssets: number;
}

export function SummaryRow({ summary, totalSeries, totalAssets }: SummaryRowProps) {
  return (
    <section className="panel" aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="section-title">
        Today at a glance
      </h2>
      <div className="summary-grid">
        <div className="stat-tile">
          <span className="stat-tile__label">Largest Kalshi signal</span>
          <span className="stat-tile__value tabular-nums">
            {summary.largestKalshiSignal ? summary.largestKalshiSignal.ticker : "—"}
          </span>
          <span className="stat-tile__sub tabular-nums">
            {summary.largestKalshiSignal ? formatSignal(summary.largestKalshiSignal.absSignal) : "No valid signal"}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile__label">Most elevated crypto RVol</span>
          <span className="stat-tile__value tabular-nums">
            {summary.mostElevatedCryptoRVol ? summary.mostElevatedCryptoRVol.symbol : "—"}
          </span>
          <span className="stat-tile__sub tabular-nums">
            {summary.mostElevatedCryptoRVol ? formatPercent(summary.mostElevatedCryptoRVol.rvol5) : "No valid data"}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile__label">Strongest paper-matched signal</span>
          <span className="stat-tile__value tabular-nums">
            {summary.strongestPaperMatchedSignal
              ? `${summary.strongestPaperMatchedSignal.symbol} / ${summary.strongestPaperMatchedSignal.seriesTicker}`
              : "—"}
          </span>
          <span className="stat-tile__sub tabular-nums">
            {summary.strongestPaperMatchedSignal
              ? `${formatOrdinal(summary.strongestPaperMatchedSignal.percentile)} percentile`
              : "Insufficient history"}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile__label">Valid series updated</span>
          <span className="stat-tile__value tabular-nums">
            {summary.validSeriesCount} / {totalSeries}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile__label">Valid assets updated</span>
          <span className="stat-tile__value tabular-nums">
            {summary.validAssetCount} / {totalAssets}
          </span>
        </div>
      </div>
    </section>
  );
}
