import type { AssetSummary, SeriesSummary } from "../lib/types.ts";
import { formatPercent, formatPercentileLabel, formatPrice, formatSignalPp, formatSignedPercent } from "../lib/format.ts";
import { getMatchedSeriesFreshness } from "../lib/deriveSummary.ts";
import { friendlyChannelName, historicalRelationshipFor } from "../lib/channelPresentation.ts";
import { computeSignalActivity, SIGNAL_ACTIVITY_LABEL, type SignalActivity } from "../lib/signalActivity.ts";
import { RVolSparkline } from "./RVolSparkline.tsx";
import { InfoTip } from "./InfoTip.tsx";

interface AssetCardProps {
  asset: AssetSummary;
  series: SeriesSummary[];
}

function statusBadgeClass(activity: SignalActivity | null): string {
  if (activity === "active") return "badge--pink";
  if (activity === "watch") return "badge--watch";
  if (activity === "no_elevated") return "badge--neutral";
  return "badge--unreliable";
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
  const statusLabel = activity ? SIGNAL_ACTIVITY_LABEL[activity] : "No reliable signal";

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
          <div className="metric-label">5-day volatility</div>
          <div className="metric-value tabular-nums">{formatPercent(asset.rvol5)}</div>
        </div>
        <div>
          <div className="metric-label">vs. 20-day average</div>
          <div className={`metric-value tabular-nums ${rvolChangeClass}`}>
            {formatSignedPercent(asset.rvolChangeVs20dAvg)}
          </div>
        </div>
      </div>

      <RVolSparkline history={asset.history} color="var(--color-accent-cyan)" />

      <div className="asset-card__channel">
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <span className={`badge ${statusBadgeClass(activity)}`}>{statusLabel}</span>
          <InfoTip
            label={
              <>
                This relationship is probabilistic, based on historical statistical association in the source
                paper -- not a deterministic or guaranteed forecast.
                <br />
                <br />
                <strong>Research strength:</strong> {asset.evidenceBadge}
                {primaryChannel ? ` — ${primaryChannel.description}` : ""}
              </>
            }
          />
        </div>

        {hasReliableChannel && (
          <div className="text-secondary" style={{ fontSize: "0.82rem" }}>
            <div>Matched channel: {asset.primaryChannelTicker ? friendlyChannelName(asset.symbol, asset.primaryChannelTicker) : "—"}</div>
            <div className="tabular-nums">
              Current reading: {formatPercentileLabel(asset.signalPercentile90d)} &middot;{" "}
              {formatSignalPp(asset.primaryChannelLatestAbsSignal)}
            </div>
          </div>
        )}

        <div style={{ fontSize: "0.82rem" }}>
          <div className="text-muted">Historical relationship:</div>
          <div className="text-secondary">{historicalRelationshipFor(asset)}</div>
        </div>
      </div>
    </article>
  );
}
