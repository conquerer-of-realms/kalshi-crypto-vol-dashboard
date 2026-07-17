import { useMemo, useState } from "react";
import type { SeriesSummary, SeriesStatus } from "../lib/types.ts";
import {
  formatDateShort,
  formatInteger,
  formatPercentileRank,
  formatSignalPp,
  formatSignedSignalPp,
  formatVolume,
} from "../lib/format.ts";
import { computeSeriesFreshness, SERIES_FRESHNESS_LABEL, type SeriesFreshness } from "../lib/seriesFreshness.ts";

interface SignalTableProps {
  series: SeriesSummary[];
}

type SortKey = "absSignal" | "percentile90d" | "volume" | "ticker";

const STATUS_LABEL: Record<SeriesStatus, string> = {
  valid: "Valid",
  no_active_markets: "No active markets",
  insufficient_data: "Insufficient data",
  api_error: "API error",
};

function statusBadgeClass(status: SeriesStatus): string {
  if (status === "valid") return "badge--fresh";
  if (status === "api_error") return "badge--failed";
  return "badge--neutral";
}

// Reuses the existing fresh/stale/failed badge palette: fresh=green,
// stale=amber, dormant=red (dormant is the most severe tier -- data has
// stopped updating for over two weeks).
function freshnessBadgeClass(freshness: SeriesFreshness): string {
  if (freshness === "fresh") return "badge--fresh";
  if (freshness === "stale") return "badge--stale";
  return "badge--failed";
}

function sortValue(s: SeriesSummary, key: SortKey): number | string {
  switch (key) {
    case "absSignal":
      return s.latestAbsSignal ?? -Infinity;
    case "percentile90d":
      return s.percentile90d ?? -Infinity;
    case "volume":
      return s.totalWeight ?? -Infinity;
    case "ticker":
      return s.ticker;
  }
}

export function SignalTable({ series }: SignalTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("absSignal");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const now = useMemo(() => new Date(), []);

  const sorted = useMemo(() => {
    const copy = [...series];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (typeof av === "string" || typeof bv === "string") {
        return sortDir * String(av).localeCompare(String(bv));
      }
      return sortDir * (av - bv);
    });
    return copy;
  }, [series, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  function headerButton(key: SortKey, label: string) {
    const active = sortKey === key;
    return (
      <button type="button" onClick={() => toggleSort(key)} aria-sort={active ? (sortDir === 1 ? "ascending" : "descending") : "none"}>
        {label} {active ? (sortDir === 1 ? "▲" : "▼") : ""}
      </button>
    );
  }

  return (
    <section className="panel" aria-labelledby="signal-table-heading">
      <h2 id="signal-table-heading" className="section-title">
        Kalshi signal table
      </h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{headerButton("ticker", "Series")}</th>
              <th>Macro domain</th>
              <th>Latest delta_vw</th>
              <th>{headerButton("absSignal", "Abs. signal")}</th>
              <th>30d pct</th>
              <th>{headerButton("percentile90d", "90d pct")}</th>
              <th>Markets</th>
              <th>{headerButton("volume", "Volume")}</th>
              <th>Data date</th>
              <th>Freshness</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const freshness = computeSeriesFreshness(s.latestDate, now);
              return (
                <tr key={s.ticker}>
                  <td data-label="Series">
                    <strong>{s.ticker}</strong>{" "}
                    {s.tier === "experimental" && <span className="badge badge--tier">experimental</span>}
                  </td>
                  <td data-label="Macro domain">{s.macroDomain}</td>
                  <td data-label="Latest delta_vw" className="tabular-nums">
                    {formatSignedSignalPp(s.latestDeltaVw)}
                  </td>
                  <td data-label="Abs. signal" className="tabular-nums">
                    {formatSignalPp(s.latestAbsSignal)}
                  </td>
                  <td data-label="30d pct" className="tabular-nums">
                    {formatPercentileRank(s.percentile30d)}
                  </td>
                  <td data-label="90d pct" className="tabular-nums">
                    {formatPercentileRank(s.percentile90d)}
                  </td>
                  <td data-label="Markets" className="tabular-nums">
                    {formatInteger(s.marketCount)}
                  </td>
                  <td data-label="Volume" className="tabular-nums">
                    {formatVolume(s.totalWeight)}
                  </td>
                  <td data-label="Data date" className="tabular-nums">
                    {formatDateShort(s.latestDate)}
                  </td>
                  <td data-label="Freshness">
                    {freshness ? (
                      <span className={`badge ${freshnessBadgeClass(freshness)}`}>
                        {SERIES_FRESHNESS_LABEL[freshness]}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${statusBadgeClass(s.status)}`}>{STATUS_LABEL[s.status]}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
