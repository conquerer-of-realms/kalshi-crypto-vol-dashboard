import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AssetSummary, SeriesSummary } from "../lib/types.ts";
import { formatDateShort, formatPercentileRank } from "../lib/format.ts";
import { computeRollingPercentileSeries } from "../lib/deriveTimeSeries.ts";

interface SignalVsVolLensProps {
  assets: AssetSummary[];
  series: SeriesSummary[];
}

const WINDOW_DAYS = 90;

interface TooltipPayloadItem {
  value?: number | null;
  dataKey?: string;
  color?: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="tooltip-box">
      <div>{formatDateShort(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tabular-nums" style={{ color: p.color }}>
          {p.dataKey === "kalshiPct" ? "Kalshi signal pct" : "Crypto RVol pct"}: {formatPercentileRank(p.value ?? null)}
        </div>
      ))}
    </div>
  );
}

export function SignalVsVolLens({ assets, series }: SignalVsVolLensProps) {
  const eligible = useMemo(
    () => assets.filter((a) => a.primaryChannelTicker && a.history.length > 0),
    [assets],
  );
  const [symbol, setSymbol] = useState<string>(eligible[0]?.symbol ?? "");

  const selectedAsset = eligible.find((a) => a.symbol === symbol) ?? eligible[0] ?? null;
  const matchedSeries = selectedAsset ? series.find((s) => s.ticker === selectedAsset.primaryChannelTicker) : undefined;

  const data = useMemo(() => {
    if (!selectedAsset || !matchedSeries) return [];

    const kalshiPct = computeRollingPercentileSeries(
      matchedSeries.history.map((h) => ({ date: h.date, value: h.absSignal })),
      WINDOW_DAYS,
    );
    const cryptoPct = computeRollingPercentileSeries(
      selectedAsset.history.map((h) => ({ date: h.date, value: h.rvol5 })),
      WINDOW_DAYS,
    );

    const byDate = new Map<string, { date: string; kalshiPct: number | null; cryptoPct: number | null }>();
    for (const p of kalshiPct) {
      byDate.set(p.date, { date: p.date, kalshiPct: p.percentile, cryptoPct: null });
    }
    for (const p of cryptoPct) {
      const existing = byDate.get(p.date);
      if (existing) existing.cryptoPct = p.percentile;
      else byDate.set(p.date, { date: p.date, kalshiPct: null, cryptoPct: p.percentile });
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedAsset, matchedSeries]);

  return (
    <div className="chart-panel">
      <div className="chart-controls">
        <label className="select-field">
          Paper-matched asset / channel
          <select value={symbol || selectedAsset?.symbol || ""} onChange={(e) => setSymbol(e.target.value)}>
            {eligible.map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {a.name} ({a.symbol}) -- {a.primaryChannelTicker}
              </option>
            ))}
          </select>
        </label>
      </div>

      {data.length === 0 ? (
        <p className="text-muted">Not enough matched history yet to draw this lens.</p>
      ) : (
        <>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDateShort} stroke="var(--color-text-muted)" fontSize={11} minTickGap={24} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} width={40} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="kalshiPct" stroke="var(--color-accent-pink)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                <Line type="monotone" dataKey="cryptoPct" stroke="var(--color-accent-cyan)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-row">
            <span className="legend-swatch">
              <span className="legend-swatch__dot" style={{ background: "var(--color-accent-pink)" }} />
              Kalshi signal percentile ({matchedSeries?.ticker})
            </span>
            <span className="legend-swatch">
              <span className="legend-swatch__dot" style={{ background: "var(--color-accent-cyan)" }} />
              Crypto trailing RVol percentile
            </span>
          </div>
          <p className="chart-caption">
            Both series normalized to a 0-100 trailing percentile for visual comparison only. This is not
            evidence of causality, and co-movement here does not confirm the paper's regression result.
          </p>
        </>
      )}
    </div>
  );
}
