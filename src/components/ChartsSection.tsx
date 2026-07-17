import type { AssetSummary, SeriesSummary } from "../lib/types.ts";
import { KalshiSignalChart } from "./KalshiSignalChart.tsx";
import { VolatilityChart } from "./VolatilityChart.tsx";
import { SignalVsVolLens } from "./SignalVsVolLens.tsx";

interface ChartsSectionProps {
  series: SeriesSummary[];
  assets: AssetSummary[];
}

export function ChartsSection({ series, assets }: ChartsSectionProps) {
  return (
    <section aria-labelledby="charts-heading" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h2 id="charts-heading" className="section-title" style={{ marginBottom: 0 }}>
        Charts
      </h2>

      <div className="panel">
        <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Kalshi signal history</h3>
        <KalshiSignalChart series={series} />
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Crypto realized-volatility history</h3>
        <VolatilityChart assets={assets} />
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Signal vs. volatility lens</h3>
        <SignalVsVolLens assets={assets} series={series} />
      </div>
    </section>
  );
}
