import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AssetSummary } from "../lib/types.ts";
import { formatDateShort, formatPercent } from "../lib/format.ts";

interface VolatilityChartProps {
  assets: AssetSummary[];
}

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
          {p.dataKey === "rvol5" ? "5d RVol" : "20d avg"}: {formatPercent(p.value ?? null)}
        </div>
      ))}
    </div>
  );
}

export function VolatilityChart({ assets }: VolatilityChartProps) {
  const eligible = useMemo(() => assets.filter((a) => a.history.length > 0), [assets]);
  const [symbol, setSymbol] = useState<string>(eligible[0]?.symbol ?? "");

  const selected = eligible.find((a) => a.symbol === symbol) ?? eligible[0] ?? null;
  const data = selected ? selected.history : [];

  return (
    <div className="chart-panel">
      <div className="chart-controls">
        <label className="select-field">
          Asset
          <select value={symbol || selected?.symbol || ""} onChange={(e) => setSymbol(e.target.value)}>
            {eligible.map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {a.name} ({a.symbol})
              </option>
            ))}
          </select>
        </label>
      </div>

      {data.length === 0 ? (
        <p className="text-muted">No volatility history available yet.</p>
      ) : (
        <>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDateShort} stroke="var(--color-text-muted)" fontSize={11} minTickGap={24} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} width={56} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="rvol5" stroke="var(--color-accent-pink)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                <Line type="monotone" dataKey="rvol20Avg" stroke="var(--color-accent-cyan)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-row">
            <span className="legend-swatch">
              <span className="legend-swatch__dot" style={{ background: "var(--color-accent-pink)" }} />
              5-day trailing RVol (annualized)
            </span>
            <span className="legend-swatch">
              <span className="legend-swatch__dot" style={{ background: "var(--color-accent-cyan)" }} />
              20-day average
            </span>
          </div>
          <p className="chart-caption">Observed (trailing) realized volatility only -- never a future forecast.</p>
        </>
      )}
    </div>
  );
}
