import { describe, expect, it } from "vitest";
import { logReturn, realizedVolatility, sampleStdDev, trailingAverage } from "../scripts/calculations/volatility.ts";

describe("logReturn", () => {
  it("matches ln(110/100) for the spec's worked example", () => {
    expect(logReturn(100, 110)).toBeCloseTo(Math.log(1.1), 12);
  });

  it("returns null for non-positive or missing prices", () => {
    expect(logReturn(0, 110)).toBeNull();
    expect(logReturn(100, 0)).toBeNull();
    expect(logReturn(null, 110)).toBeNull();
    expect(logReturn(100, undefined)).toBeNull();
    expect(logReturn(-5, 110)).toBeNull();
  });
});

describe("sampleStdDev", () => {
  it("uses n-1 in the denominator", () => {
    // values: 1,2,3,4,5 -> mean 3, sum sq diff = 10, variance = 10/4 = 2.5
    const sd = sampleStdDev([1, 2, 3, 4, 5]);
    expect(sd).toBeCloseTo(Math.sqrt(2.5), 12);
  });

  it("returns null with fewer than 2 values", () => {
    expect(sampleStdDev([1])).toBeNull();
    expect(sampleStdDev([])).toBeNull();
  });
});

describe("realizedVolatility", () => {
  it("computes sqrt(252) * sample_std_dev of five log returns", () => {
    const returns = [0.01, -0.02, 0.015, 0.0, -0.005];
    const expectedSd = sampleStdDev(returns) as number;
    const result = realizedVolatility(returns, 5);
    expect(result).toBeCloseTo(Math.sqrt(252) * expectedSd, 12);
  });

  it("requires exactly windowSize values and returns null otherwise", () => {
    expect(realizedVolatility([0.01, 0.02, 0.03], 5)).toBeNull();
    expect(realizedVolatility([0.01, 0.02, 0.03, 0.01, 0.02, 0.03], 5)).toBeNull();
  });

  it("returns null if any return in the window is missing (never zero-filled)", () => {
    expect(realizedVolatility([0.01, null, 0.015, 0.0, -0.005], 5)).toBeNull();
    expect(realizedVolatility([0.01, undefined, 0.015, 0.0, -0.005], 5)).toBeNull();
  });
});

describe("trailingAverage", () => {
  it("averages only the non-null values within the trailing window", () => {
    const values = [0.1, null, 0.2, 0.3, null, 0.4];
    // last 20 (all of them here): valid = [0.1, 0.2, 0.3, 0.4] -> mean 0.25
    expect(trailingAverage(values, 20)).toBeCloseTo(0.25, 12);
  });

  it("returns null when there are no valid values in the window", () => {
    expect(trailingAverage([null, null, undefined], 20)).toBeNull();
  });

  it("respects the window size boundary", () => {
    const values = [1, 1, 1, 100]; // window 1 -> only the last value
    expect(trailingAverage(values, 1)).toBeCloseTo(100, 12);
  });
});
