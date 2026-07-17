import type { AssetSummary, PaperDirection, SeriesSummary } from "../lib/types.ts";
import {
  formatPercent,
  formatPercentileRank,
  formatPrice,
  formatSignalPp,
  formatSignedPercent,
} from "../lib/format.ts";
import { getMatchedSeriesFreshness } from "../lib/deriveSummary.ts";
import { computeSignalActivity, SIGNAL_ACTIVITY_LABEL, type SignalActivity } from "../lib/signalActivity.ts";
import { RVolSparkline } from "./RVolSparkline.tsx";
import { InfoTip } from "./InfoTip.tsx";

interface AssetCardProps {
  asset: AssetSummary;
  series: SeriesSummary[];
}

const DIRECTION_LABEL: Record<PaperDirection, string> = {
  higher: "Higher expected volatility",
  lower: "Lower expected volatility",
  mixed: "Mixed",
  no_signal: "No reliable signal",
};

function activityBadgeClass(activity: SignalActivity): string {
  if (activity === "active") return "badge--pink";
  if (activity === "watch") return "badge--tier";
  return "badge--neutral";
}

export function AssetCard({ asset, series }: AssetCardProps) {
  const primaryChannel = asset.channels[0] ?? null;
  const returnClass = asset.return1d === null ? "" : asset.return1d >= 0 ? "text-positive" : "text-negative";
  const rvolChangeClass =
    asset.rvolChangeVs20dAvg === null ? "" : asset.rvolChangeVs20dAvg >= 0 ? "text-negative" : "text-positive";

  // A stale/dormant matched series can never read as an active/watch signal
  // today, regardless of its last-known percentile (see signalActivity.ts).
  // Assets with no reliable channel at all (paperDirection "no_signal", e.g.
  // Avalanche) never get an activity tier -- they always read "No reliable
  // signal" instead of "No elevated signal", per spec.
  const hasReliableChannel = asset.paperDirection !== "no_signal";
  const activity: SignalActivity | null = hasReliableChannel
    ? computeSignalActivity(asset.signalPercentile90d, getMatchedSeriesFreshness(asset, series))
    : null;

  return (
    <article className="asset-card panel" aria-labelledby={`asset-${asset.symbol}-name`}>
      <div className="asset-card__header">
        <div>
          <h3 className="asset-card__name" id={`asset-${asset.symbol}-name`}>
            {asset.name}
          </h3>
          <span className="asset-card__symbol">{asset.symbol}</span>
        </div>
        {asset.status !== "valid" && <span className="badge badge--failed">{asset.status.replace("_", " ")}</span>}
      </div>

      <div className="asset-card__price-row">
        <span className="asset-card__price tabular-nums">{formatPrice(asset.price)}</span>
        <span className={`tabular-nums ${returnClass}`}>{formatSignedPercent(asset.return1d)} 1d</span>
      </div>

      <div className="asset-card__metrics">
        <div>
          <div className="metric-label">5-day RVol (ann.)</div>
          <div className="metric-value tabular-nums">{formatPercent(asset.rvol5)}</div>
        </div>
        <div>
          <div className="metric-label">20-day RVol avg</div>
          <div className="metric-value tabular-nums">{formatPercent(asset.rvol20Avg)}</div>
        </div>
        <div>
          <div className="metric-label">Vs. 20d avg</div>
          <div className={`metric-value tabular-nums ${rvolChangeClass}`}>
            {formatSignedPercent(asset.rvolChangeVs20dAvg)}
          </div>
        </div>
        <div>
          <div className="metric-label">Signal percentile (90d)</div>
          <div className="metric-value tabular-nums">{formatPercentileRank(asset.signalPercentile90d)}</div>
        </div>
      </div>

      <RVolSparkline history={asset.history} color="var(--color-accent-cyan)" />

      <div className="asset-card__channel">
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <span className="badge badge--pink">{primaryChannel ? primaryChannel.seriesTicker : "No channel"}</span>
          <span className="badge badge--neutral">{asset.evidenceBadge}</span>
          <InfoTip label="This relationship is probabilistic, based on historical statistical association in the source paper -- not a deterministic or guaranteed forecast." />
        </div>

        {/* Signal activity: whether today's reading is actually elevated --
            kept visually and semantically separate from the paper's
            historical direction finding below, so a backward-looking
            association is never read as an active, right-now forecast. */}
        <div>
          <span className={`badge ${activity ? activityBadgeClass(activity) : "badge--neutral"}`}>
            {activity ? SIGNAL_ACTIVITY_LABEL[activity] : "No reliable signal"}
          </span>
        </div>

        <div className="text-secondary" style={{ fontSize: "0.82rem" }}>
          <strong className="text-muted">Per the paper: </strong>
          {hasReliableChannel ? DIRECTION_LABEL[asset.paperDirection] : DIRECTION_LABEL.no_signal} &mdash;{" "}
          {primaryChannel?.description ?? "No reliable primary signal was found for this asset in the source paper."}
        </div>
        <div className="text-muted tabular-nums" style={{ fontSize: "0.78rem" }}>
          Latest signal magnitude: {formatSignalPp(asset.primaryChannelLatestAbsSignal)}
        </div>
      </div>
    </article>
  );
}
