import { computeFreshness, freshnessLabel } from "../lib/freshness.ts";

interface FreshnessBadgeProps {
  generatedAt: string | null;
  buildStatus: string;
}

export function FreshnessBadge({ generatedAt, buildStatus }: FreshnessBadgeProps) {
  const status = computeFreshness(generatedAt, buildStatus);
  return (
    <span className={`badge badge--${status}`} title="Freshness is based on the actual last-updated timestamp, not the expected schedule.">
      <span aria-hidden="true">●</span> {freshnessLabel(status)}
    </span>
  );
}
