import { describe, expect, it } from "vitest";
import { approximateDollarVolume, computeDeltaVw, computeFedDovish } from "../scripts/calculations/kalshiSignal.ts";

describe("computeDeltaVw", () => {
  it("matches the spec's worked example", () => {
    // Market A: prev 0.40 -> curr 0.50, weight 100
    // Market B: prev 0.70 -> curr 0.65, weight 300
    // delta_vw = (100*0.10 + 300*-0.05) / 400 = -0.0125
    const result = computeDeltaVw([
      { ticker: "A", weight: 100, previousClose: 0.4, currentClose: 0.5 },
      { ticker: "B", weight: 300, previousClose: 0.7, currentClose: 0.65 },
    ]);

    expect(result.deltaVw).toBeCloseTo(-0.0125, 10);
    expect(result.absSignal).toBeCloseTo(0.0125, 10);
    expect(result.totalWeight).toBe(400);
    expect(result.marketCount).toBe(2);
  });

  it("excludes a market/day missing a previous close rather than treating it as zero", () => {
    const result = computeDeltaVw([
      { ticker: "A", weight: 100, previousClose: 0.4, currentClose: 0.5 },
      { ticker: "B", weight: 300, previousClose: null, currentClose: 0.65 },
    ]);

    // Only market A contributes: delta_vw = (100*0.10)/100 = 0.10
    expect(result.deltaVw).toBeCloseTo(0.1, 10);
    expect(result.marketCount).toBe(1);
    expect(result.totalWeight).toBe(100);
  });

  it("excludes a market/day missing a current close", () => {
    const result = computeDeltaVw([
      { ticker: "A", weight: 100, previousClose: 0.4, currentClose: undefined },
      { ticker: "B", weight: 300, previousClose: 0.7, currentClose: 0.65 },
    ]);
    expect(result.marketCount).toBe(1);
    expect(result.deltaVw).toBeCloseTo(-0.05, 10);
  });

  it("returns null (not zero) when aggregate weight is zero", () => {
    const result = computeDeltaVw([
      { ticker: "A", weight: 0, previousClose: 0.4, currentClose: 0.5 },
      { ticker: "B", weight: -5, previousClose: 0.7, currentClose: 0.65 },
    ]);
    expect(result.deltaVw).toBeNull();
    expect(result.absSignal).toBeNull();
    expect(result.totalWeight).toBe(0);
    expect(result.marketCount).toBe(0);
  });

  it("returns null for an empty observation list (no active markets that day)", () => {
    const result = computeDeltaVw([]);
    expect(result.deltaVw).toBeNull();
    expect(result.marketCount).toBe(0);
  });
});

describe("computeFedDovish", () => {
  it("negates delta_vw(KXFED,t)", () => {
    expect(computeFedDovish(-0.0125)).toBeCloseTo(0.0125, 10);
    expect(computeFedDovish(0.02)).toBeCloseTo(-0.02, 10);
  });

  it("returns null when the input signal is null", () => {
    expect(computeFedDovish(null)).toBeNull();
    expect(computeFedDovish(undefined)).toBeNull();
  });
});

describe("approximateDollarVolume", () => {
  it("prefers mean_price when available", () => {
    expect(approximateDollarVolume(100, 0.45, 0.5)).toBeCloseTo(45, 10);
  });

  it("falls back to close_price when mean_price is unavailable", () => {
    expect(approximateDollarVolume(100, null, 0.5)).toBeCloseTo(50, 10);
  });

  it("returns null when both prices are missing or non-positive", () => {
    expect(approximateDollarVolume(100, null, null)).toBeNull();
    expect(approximateDollarVolume(100, 0, 0)).toBeNull();
  });

  it("returns null when volume is missing or non-positive", () => {
    expect(approximateDollarVolume(null, 0.5, 0.5)).toBeNull();
    expect(approximateDollarVolume(0, 0.5, 0.5)).toBeNull();
  });
});
