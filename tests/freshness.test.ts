import { describe, expect, it } from "vitest";
import { computeFreshness } from "../src/lib/freshness.ts";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

describe("computeFreshness", () => {
  it("is fresh under 30 hours", () => {
    expect(computeFreshness(hoursAgo(5), "ok")).toBe("fresh");
    expect(computeFreshness(hoursAgo(29.9), "ok")).toBe("fresh");
  });

  it("is stale between 30 and 72 hours", () => {
    expect(computeFreshness(hoursAgo(30.1), "ok")).toBe("stale");
    expect(computeFreshness(hoursAgo(72), "ok")).toBe("stale");
  });

  it("is failed over 72 hours", () => {
    expect(computeFreshness(hoursAgo(72.1), "ok")).toBe("failed");
    expect(computeFreshness(hoursAgo(500), "ok")).toBe("failed");
  });

  it("is failed when the build itself reported an error, regardless of age", () => {
    expect(computeFreshness(hoursAgo(1), "error")).toBe("failed");
  });

  it("is failed when there is no timestamp at all", () => {
    expect(computeFreshness(null, "ok")).toBe("failed");
    expect(computeFreshness(undefined, "ok")).toBe("failed");
  });

  it("relies on the actual timestamp, not an assumed schedule -- a late scheduled run does not read as failed prematurely", () => {
    // e.g. a workflow that was supposed to run at 00:20 UTC but actually ran 10 hours late is still "fresh"
    expect(computeFreshness(hoursAgo(10), "ok")).toBe("fresh");
  });
});
