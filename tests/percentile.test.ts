import { describe, expect, it } from "vitest";
import { computeTrailingPercentile } from "../scripts/calculations/percentile.ts";

describe("computeTrailingPercentile", () => {
  it("ranks a normal value against its window", () => {
    // 30 values 1..30 (window = [1,2,...,30]); latest = 30 (the max)
    const values = Array.from({ length: 30 }, (_, i) => i + 1);
    const result = computeTrailingPercentile(values, 30);
    expect(result.status).toBe("ok");
    expect(result.validCount).toBe(30);
    // 29 strictly less, 0 equal beyond itself -> (29 + 0.5)/30 * 100
    // (result is rounded to 2 decimals by computeTrailingPercentile)
    expect(result.percentile).toBeCloseTo((29.5 / 30) * 100, 1);
  });

  it("ranks the minimum value near the 0th percentile", () => {
    const values = Array.from({ length: 30 }, (_, i) => 30 - i); // last element = 1 (min)
    const result = computeTrailingPercentile(values, 30);
    expect(result.percentile).toBeCloseTo((0.5 / 30) * 100, 1);
  });

  it("handles ties using the mean-rank convention", () => {
    // window of 30 values, all equal to 5 -- latest is also 5.
    const values = Array.from({ length: 30 }, () => 5);
    const result = computeTrailingPercentile(values, 30);
    // lessCount 0, equalCount 30 -> rank = (0 + 0.5*30)/30 = 0.5 -> 50th percentile
    expect(result.percentile).toBeCloseTo(50, 6);
  });

  it("excludes missing (null/undefined) values from the ranking, never treating them as zero", () => {
    const values: Array<number | null> = [10, null, 20, null, 30, 40, 50];
    // pad to reach the 30-observation minimum with valid values so the missing-value handling itself is under test
    const padded = [...Array.from({ length: 25 }, () => 25), ...values];
    const result = computeTrailingPercentile(padded, 30);
    expect(result.status).toBe("ok");
    // valid count should exclude the two nulls: 25 padding + 5 real = 30
    expect(result.validCount).toBe(30);
  });

  it("reports insufficient_history and a null percentile below the minimum valid observation count", () => {
    const values = [1, 2, 3, 4, 5];
    const result = computeTrailingPercentile(values, 30);
    expect(result.status).toBe("insufficient_history");
    expect(result.percentile).toBeNull();
  });

  it("returns insufficient_history when the latest value itself is missing", () => {
    const values = Array.from({ length: 30 }, (_, i) => i + 1);
    const withMissingLatest = [...values.slice(0, -1), null];
    const result = computeTrailingPercentile(withMissingLatest, 30);
    expect(result.status).toBe("insufficient_history");
    expect(result.percentile).toBeNull();
  });
});
