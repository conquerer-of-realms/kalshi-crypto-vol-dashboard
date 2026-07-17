import { describe, expect, it } from "vitest";
import { computeSeriesFreshness } from "../src/lib/seriesFreshness.ts";

// Fixed reference "now": Wednesday 2026-07-15 (UTC), chosen so business-day
// vs. calendar-day counting can be verified by hand across a weekend.
const NOW = new Date(Date.UTC(2026, 6, 15));

describe("computeSeriesFreshness", () => {
  it("returns null when there is no data date", () => {
    expect(computeSeriesFreshness(null, NOW)).toBeNull();
    expect(computeSeriesFreshness(undefined, NOW)).toBeNull();
  });

  it("returns null for an unparseable date", () => {
    expect(computeSeriesFreshness("not-a-date", NOW)).toBeNull();
  });

  it("is fresh for the current day", () => {
    expect(computeSeriesFreshness("2026-07-15", NOW)).toBe("fresh");
  });

  it("is fresh for a future date (defensive: never past 'now')", () => {
    expect(computeSeriesFreshness("2026-07-20", NOW)).toBe("fresh");
  });

  it("is fresh for 1 business day old data", () => {
    // 2026-07-14 is a Tuesday, 1 business day before the Wednesday reference
    expect(computeSeriesFreshness("2026-07-14", NOW)).toBe("fresh");
  });

  it("is fresh at exactly the 3-business-day boundary (across a weekend)", () => {
    // 2026-07-10 (Fri) -> Sat, Sun excluded -> Mon, Tue, Wed = 3 business days
    expect(computeSeriesFreshness("2026-07-10", NOW)).toBe("fresh");
  });

  it("is stale just past the 3-business-day boundary", () => {
    // 2026-07-09 (Thu) -> Fri, Mon, Tue, Wed = 4 business days (6 calendar days)
    expect(computeSeriesFreshness("2026-07-09", NOW)).toBe("stale");
  });

  it("is stale at exactly the 14-calendar-day boundary", () => {
    expect(computeSeriesFreshness("2026-07-01", NOW)).toBe("stale");
  });

  it("is dormant just past the 14-calendar-day boundary", () => {
    expect(computeSeriesFreshness("2026-06-30", NOW)).toBe("dormant");
  });

  it("is dormant for data far in the past", () => {
    expect(computeSeriesFreshness("2026-01-14", NOW)).toBe("dormant");
  });
});
