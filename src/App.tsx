import { useDashboardData } from "./lib/useDashboardData.ts";
import { Header } from "./components/Header.tsx";
import { SummaryRow } from "./components/SummaryRow.tsx";
import { AssetGrid } from "./components/AssetGrid.tsx";
import { SignalTable } from "./components/SignalTable.tsx";
import { ChartsSection } from "./components/ChartsSection.tsx";
import { MethodologyPanel } from "./components/MethodologyPanel.tsx";
import { Footer } from "./components/Footer.tsx";

function LoadingSkeleton() {
  // Shown only during local dev while the static JSON round-trips; a
  // production build reads the same static file and resolves near-instantly,
  // so it intentionally does not get this animated skeleton (spec: "Loading
  // skeleton only for local dev; production reads static data immediately").
  return (
    <div className="page" aria-busy="true" aria-label="Loading dashboard data">
      <div className="skeleton" style={{ height: 72 }} />
      <div className="skeleton" style={{ height: 120 }} />
      <div className="asset-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 260 }} />
        ))}
      </div>
    </div>
  );
}

function MinimalLoadingFallback() {
  return <div className="page" aria-busy="true" aria-label="Loading dashboard data" />;
}

function FetchErrorState({ message }: { message: string }) {
  return (
    <div className="page">
      <div className="error-banner" role="alert">
        <strong>Could not load dashboard data.</strong> {message}
        <br />
        This usually means <code>public/data/dashboard.json</code> has not been generated yet. Run{" "}
        <code>npm run data:update</code> (or <code>npm run data:fixture</code> for demo data) and reload.
      </div>
    </div>
  );
}

export default function App() {
  const { data, loading, error } = useDashboardData();

  if (loading) {
    return import.meta.env.DEV ? <LoadingSkeleton /> : <MinimalLoadingFallback />;
  }

  if (error || !data) {
    return <FetchErrorState message={error ?? "Unknown error"} />;
  }

  const buildFailed = data.status === "error";

  return (
    <div className="page">
      <Header generatedAt={data.generatedAt} status={data.status} isFixtureData={data.isFixtureData} />

      {buildFailed && (
        <div className="error-banner" role="alert">
          <strong>Upstream data build failed.</strong> No valid Kalshi series or no valid crypto assets could be
          produced on the last run. The figures below (if any) are from the last successful build and may be stale.
        </div>
      )}

      {!buildFailed && data.warnings.length > 0 && (
        <details className="panel">
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            {data.warnings.length} data warning{data.warnings.length === 1 ? "" : "s"} from the last update
          </summary>
          <ul style={{ marginTop: "0.75rem", color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <SummaryRow summary={data.summary} series={data.series} assets={data.assets} totalAssets={data.assets.length} />

      <AssetGrid assets={data.assets} series={data.series} />

      <SignalTable series={data.series} />

      <ChartsSection series={data.series} assets={data.assets} />

      <MethodologyPanel
        methodology={data.methodology}
        volumeWeightMethod={data.sources.kalshi.volumeWeightMethod}
        targetCalendarDays={data.dataWindow.targetCalendarDays}
        minValidObservations={data.dataWindow.minValidObservations}
      />

      <Footer />
    </div>
  );
}
