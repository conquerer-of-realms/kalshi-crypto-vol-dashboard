import type { AssetSummary, PaperDirection } from "../lib/types.ts";
import {
  formatPercent,
  formatPercentileRank,
  formatPrice,
  formatSignal,
  formatSignedPercent,
} from "../lib/format.ts";
import { RVolSparkline } from "./RVolSparkline.tsx";
import { InfoTip } from "./InfoTip.tsx";

interface AssetCardProps {
  asset: AssetSummary;
}

const DIRECTION_LABEL: Record<PaperDirection, string> = {
  higher: "Higher expected volatility",
  lower: "Lower expected volatility",
  mixed: "Mixed",
  no_signal: "No reliable signal",
};

const DIRECTION_ARROW: Record<PaperDirection, string> = {
  higher: "↑",
  lower: "↓",
  mixed: "↔",
  no_signal: "–",
};

function directionClassName(direction: PaperDirection): string {
  if (direction === "higher") return "text-negative";
  if (direction === "lower") return "text-positive";
  return "text-muted";
}

export function AssetCard({ asset }: AssetCardProps) {
  const primaryChannel = asset.channels[0] ?? null;
  const returnClass = asset.return1d === null ? "" : asset.return1d >= 0 ? "text-positive" : "text-negative";
  const rvolChangeClass =
    asset.rvolChangeVs20dAvg === null ? "" : asset.rvolChangeVs20dAvg >= 0 ? "text-negative" : "text-positive";

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
        <div className={`direction-pill ${directionClassName(asset.paperDirection)}`}>
          <span aria-hidden="true">{DIRECTION_ARROW[asset.paperDirection]}</span>
          <span>{DIRECTION_LABEL[asset.paperDirection]}</span>
        </div>
        <div className="text-secondary" style={{ fontSize: "0.82rem" }}>
          {primaryChannel?.description ?? "No reliable primary signal was found for this asset in the source paper."}
        </div>
        <div className="text-muted tabular-nums" style={{ fontSize: "0.78rem" }}>
          Latest signal magnitude: {formatSignal(asset.primaryChannelLatestAbsSignal)}
        </div>
      </div>
    </article>
  );
}
