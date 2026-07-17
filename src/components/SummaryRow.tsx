import { useMemo } from "react";
import type { AssetSummary, SeriesSummary, SummaryRow as SummaryRowData } from "../lib/types.ts";
import { formatOrdinal, formatPercent, formatSignalPp } from "../lib/format.ts";
import {
  computeLargestFreshKalshiSignal,
  computeSeriesFreshnessCounts,
  computeTopPaperMatchedChannel,
} from "../lib/deriveSummary.ts";

interface SummaryRowProps {
  summary: SummaryRowData;
  series: SeriesSummary[];
  assets: AssetSummary[];
  totalAssets: number;
}

export function SummaryRow({ summary, series, assets, totalAssets }: SummaryRowProps) {
  // Computed against real "now" (not the build's generatedAt) so a series
  // that has quietly gone dormant is reflected immediately, even between
  // builds -- see src/lib/seriesFreshness.ts.
  const now = useMemo(() => new Date(), []);

  const freshnessCounts = useMemo(() => computeSeriesFreshnessCounts(series, now), [series, now]);
  const largestFreshSignal = useMemo(() => computeLargestFreshKalshiSignal(series, now), [series, now]);
  const topPaperMatchedChannel = useMemo(
    () => computeTopPaperMatchedChannel(assets, series, now),
    [assets, series, now],
  );

  return (
    <section className="panel" aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="section-title">
        Today at a glance
      </h2>
      <div className="summary-grid">
        <div className="stat-tile">
          <span className="stat-tile__label">Largest Kalshi signal</span>
          <span className="stat-tile__value tabular-nums">
            {largestFreshSignal ? largestFreshSignal.ticker : "—"}
          </span>
          <span className="stat-tile__sub tabular-nums">
            {largestFreshSignal ? formatSignalPp(largestFreshSignal.absSignal) : "No current signal"}
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
          <span className="stat-tile__label">Top paper-matched channel today</span>
          {topPaperMatchedChannel ? (
            <>
              <span className="stat-tile__value tabular-nums">
                {topPaperMatchedChannel.symbol} / {topPaperMatchedChannel.seriesTicker}
              </span>
              <span className="stat-tile__sub tabular-nums">
                {formatOrdinal(topPaperMatchedChannel.percentile)} percentile
              </span>
            </>
          ) : (
            <span className="stat-tile__value" style={{ fontSize: "1.05rem" }}>
              No elevated paper-matched signal
            </span>
          )}
        </div>

        <div className="stat-tile">
          <span className="stat-tile__label">Series freshness</span>
          <span className="stat-tile__value tabular-nums">{freshnessCounts.current} current</span>
          <span className="stat-tile__sub tabular-nums">
            {freshnessCounts.stale} stale &middot; {freshnessCounts.dormant} dormant
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
