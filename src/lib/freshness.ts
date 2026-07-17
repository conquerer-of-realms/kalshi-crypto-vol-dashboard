export type FreshnessStatus = "fresh" | "stale" | "failed";

const FRESH_HOURS = 30;
const STALE_HOURS = 72;

/**
 * Freshness is always derived from the actual generatedAt timestamp at
 * render time, never from the expected cron schedule -- GitHub scheduled
 * workflows can run late, so the badge must reflect reality.
 */
export function computeFreshness(generatedAt: string | null | undefined, buildStatus: string): FreshnessStatus {
  if (buildStatus === "error") return "failed";
  if (!generatedAt) return "failed";

  const generatedMs = Date.parse(generatedAt);
  if (Number.isNaN(generatedMs)) return "failed";

  const hoursSince = (Date.now() - generatedMs) / (1000 * 60 * 60);
  if (hoursSince < FRESH_HOURS) return "fresh";
  if (hoursSince <= STALE_HOURS) return "stale";
  return "failed";
}

export function freshnessLabel(status: FreshnessStatus): string {
  switch (status) {
    case "fresh":
      return "Fresh";
    case "stale":
      return "Stale";
    case "failed":
      return "Failed";
  }
}
