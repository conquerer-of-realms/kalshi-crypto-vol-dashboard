// Formatting helpers. Every function tolerates null (missing data) and
// renders an explicit "—" rather than a fabricated 0 or blank string.

const EM_DASH = "—";

export function formatNumberOrDash(
  value: number | null | undefined,
  formatter: (v: number) => string,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EM_DASH;
  return formatter(value);
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  return formatNumberOrDash(value, (v) => `${(v * 100).toFixed(decimals)}%`);
}

export function formatSignedPercent(value: number | null | undefined, decimals = 2): string {
  return formatNumberOrDash(value, (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(decimals)}%`);
}

export function ordinalSuffix(n: number): string {
  const abs = Math.abs(n) % 100;
  if (abs >= 11 && abs <= 13) return "th";
  switch (abs % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatOrdinal(value: number | null | undefined): string {
  return formatNumberOrDash(value, (v) => {
    const rounded = Math.round(v);
    return `${rounded}${ordinalSuffix(rounded)}`;
  });
}

export function formatPercentileRank(value: number | null | undefined): string {
  return formatNumberOrDash(value, (v) => `${formatOrdinal(v)} pct`);
}

export function formatPrice(value: number | null | undefined): string {
  return formatNumberOrDash(value, (v) => {
    const decimals = v >= 100 ? 2 : v >= 1 ? 4 : 6;
    return `$${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  });
}

export function formatSignal(value: number | null | undefined): string {
  return formatNumberOrDash(value, (v) => v.toFixed(4));
}

export function formatSignedSignal(value: number | null | undefined): string {
  return formatNumberOrDash(value, (v) => `${v >= 0 ? "+" : ""}${v.toFixed(4)}`);
}

export function formatVolume(value: number | null | undefined): string {
  return formatNumberOrDash(value, (v) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  });
}

export function formatInteger(value: number | null | undefined): string {
  return formatNumberOrDash(value, (v) => v.toLocaleString("en-US"));
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return EM_DASH;
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return EM_DASH;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export interface GeneratedAtDisplay {
  utc: string;
  eastern: string;
}

export function formatGeneratedAt(iso: string | null | undefined): GeneratedAtDisplay {
  if (!iso) return { utc: EM_DASH, eastern: EM_DASH };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { utc: EM_DASH, eastern: EM_DASH };

  const utc = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(d);

  const eastern = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(d);

  return { utc: `${utc} UTC`, eastern: `${eastern} ET` };
}
