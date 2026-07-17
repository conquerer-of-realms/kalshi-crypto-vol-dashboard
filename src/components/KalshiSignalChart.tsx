import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesSummary } from "../lib/types.ts";
import { formatDateShort, formatSignedSignal } from "../lib/format.ts";

interface KalshiSignalChartProps {
  series: SeriesSummary[];
}

const DEFAULT_WINDOW_DAYS = 90;

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
          {p.dataKey === "deltaVw" ? "delta_vw" : "abs_signal"}: {formatSignedSignal(p.value ?? null)}
        </div>
      ))}
    </div>
  );
}

export function KalshiSignalChart({ series }: KalshiSignalChartProps) {
  const eligible = useMemo(() => series.filter((s) => s.history.length > 0), [series]);
  const [ticker, setTicker] = useState<string>(eligible[0]?.ticker ?? "");

  const selected = eligible.find((s) => s.ticker === ticker) ?? eligible[0] ?? null;
  const data = selected ? selected.history.slice(-DEFAULT_WINDOW_DAYS) : [];

  return (
    <div className="chart-panel">
      <div className="chart-controls">
        <label className="select-field">
          Series
          <select value={ticker || selected?.ticker || ""} onChange={(e) => setTicker(e.target.value)}>
            {eligible.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} -- {s.macroDomain}
              </option>
            ))}
          </select>
        </label>
      </div>

      {data.length === 0 ? (
        <p className="text-muted">No signal history available yet.</p>
      ) : (
        <>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDateShort} stroke="var(--color-text-muted)" fontSize={11} minTickGap={24} />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  width={56}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(1)}pp`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="deltaVw" stroke="var(--color-accent-pink)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                <Line type="monotone" dataKey="absSignal" stroke="var(--color-accent-cyan)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-row">
            <span className="legend-swatch">
              <span className="legend-swatch__dot" style={{ background: "var(--color-accent-pink)" }} />
              delta_vw
            </span>
            <span className="legend-swatch">
              <span className="legend-swatch__dot" style={{ background: "var(--color-accent-cyan)" }} />
              abs_signal
            </span>
          </div>
          <p className="chart-caption">
            Daily volume-weighted probability change, last {Math.min(DEFAULT_WINDOW_DAYS, data.length)} valid
            trading days. Gaps mean no valid signal that day -- never zero-filled. Axis shown in percentage
            points (pp); tooltip values are the raw decimal probability change.
          </p>
        </>
      )}
    </div>
  );
}
