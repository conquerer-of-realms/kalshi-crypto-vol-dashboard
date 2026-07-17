import { describe, expect, it } from "vitest";
import { computeSignalActivity } from "../src/lib/signalActivity.ts";

describe("computeSignalActivity", () => {
  it("is 'active' at or above the 90th percentile when the matched series is fresh", () => {
    expect(computeSignalActivity(90, "fresh")).toBe("active");
    expect(computeSignalActivity(99.5, "fresh")).toBe("active");
  });

  it("is 'watch' between the 70th and 90th percentile when the matched series is fresh", () => {
    expect(computeSignalActivity(70, "fresh")).toBe("watch");
    expect(computeSignalActivity(89.99, "fresh")).toBe("watch");
  });

  it("is 'no_elevated' below the 70th percentile even when fresh", () => {
    expect(computeSignalActivity(69.99, "fresh")).toBe("no_elevated");
    expect(computeSignalActivity(0, "fresh")).toBe("no_elevated");
  });

  it("is 'no_elevated' when the percentile is null/undefined, regardless of freshness", () => {
    expect(computeSignalActivity(null, "fresh")).toBe("no_elevated");
    expect(computeSignalActivity(undefined, "fresh")).toBe("no_elevated");
  });

  it("never returns active or watch when the matched series is stale, even at a high percentile", () => {
    expect(computeSignalActivity(99, "stale")).toBe("no_elevated");
    expect(computeSignalActivity(75, "stale")).toBe("no_elevated");
  });

  it("never returns active or watch when the matched series is dormant, even at a high percentile", () => {
    expect(computeSignalActivity(99, "dormant")).toBe("no_elevated");
  });

  it("never returns active or watch when there is no matched series at all", () => {
    expect(computeSignalActivity(99, null)).toBe("no_elevated");
  });
});
