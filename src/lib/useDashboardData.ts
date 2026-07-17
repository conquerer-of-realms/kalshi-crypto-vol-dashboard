import { useEffect, useState } from "react";
import type { DashboardData } from "./types.ts";

export interface DashboardDataState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the statically generated dashboard.json exactly once. There is no
 * runtime API dependency: the built site only ever reads this one file
 * (respecting Vite's configured `base`, so it resolves correctly under a
 * GitHub Pages project subpath).
 */
export function useDashboardData(): DashboardDataState {
  const [state, setState] = useState<DashboardDataState>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    const url = `${import.meta.env.BASE_URL}data/dashboard.json`;

    fetch(url, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load dashboard data (HTTP ${res.status})`);
        return res.json() as Promise<DashboardData>;
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setState({ data: null, loading: false, error: message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
