import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { RVolHistoryPoint } from "../lib/types.ts";
import { formatDateShort, formatPercent } from "../lib/format.ts";

interface RVolSparklineProps {
  history: RVolHistoryPoint[];
  color: string;
}

interface TooltipPayloadItem {
  value?: number;
}

function SparklineTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="tooltip-box">
      <div>{formatDateShort(label)}</div>
      <div className="tabular-nums">RVol5: {formatPercent(payload[0]?.value ?? null)}</div>
    </div>
  );
}

export function RVolSparkline({ history, color }: RVolSparklineProps) {
  const points = history.slice(-30).filter((h) => h.rvol5 !== null);

  if (points.length < 2) {
    return (
      <div className="chart-container asset-card__chart" aria-hidden="true">
        <div className="text-muted" style={{ fontSize: "0.78rem", paddingTop: "2rem", textAlign: "center" }}>
          Not enough history for a chart yet
        </div>
      </div>
    );
  }

  return (
    <div className="asset-card__chart" role="img" aria-label="30-day trailing realized volatility trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip content={<SparklineTooltip />} />
          <Line
            type="monotone"
            dataKey="rvol5"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
