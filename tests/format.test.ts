import { describe, expect, it } from "vitest";
import { formatOrdinal, formatPercentileRank, formatSignalPp, formatSignedSignalPp } from "../src/lib/format.ts";

describe("formatOrdinal", () => {
  it("handles the standard 1st/2nd/3rd/4th pattern", () => {
    expect(formatOrdinal(1)).toBe("1st");
    expect(formatOrdinal(2)).toBe("2nd");
    expect(formatOrdinal(3)).toBe("3rd");
    expect(formatOrdinal(4)).toBe("4th");
  });

  it("handles the 11th/12th/13th exception", () => {
    expect(formatOrdinal(11)).toBe("11th");
    expect(formatOrdinal(12)).toBe("12th");
    expect(formatOrdinal(13)).toBe("13th");
  });

  it("handles 21st/22nd/23rd and larger values like 92nd", () => {
    expect(formatOrdinal(21)).toBe("21st");
    expect(formatOrdinal(22)).toBe("22nd");
    expect(formatOrdinal(23)).toBe("23rd");
    expect(formatOrdinal(92)).toBe("92nd");
    expect(formatOrdinal(100)).toBe("100th");
    expect(formatOrdinal(111)).toBe("111th");
  });

  it("renders a dash for null/undefined rather than fabricating a value", () => {
    expect(formatOrdinal(null)).toBe("—");
    expect(formatOrdinal(undefined)).toBe("—");
  });
});

describe("formatPercentileRank", () => {
  it("appends 'pct' to the ordinal", () => {
    expect(formatPercentileRank(92)).toBe("92nd pct");
    expect(formatPercentileRank(50)).toBe("50th pct");
  });
});

describe("formatSignalPp", () => {
  it("converts a raw decimal probability change to percentage points", () => {
    expect(formatSignalPp(0.4132)).toBe("41.32 pp");
    expect(formatSignalPp(-0.025)).toBe("-2.50 pp");
  });

  it("renders a dash for null/undefined", () => {
    expect(formatSignalPp(null)).toBe("—");
    expect(formatSignalPp(undefined)).toBe("—");
  });
});

describe("formatSignedSignalPp", () => {
  it("prefixes a '+' for non-negative values and converts to pp", () => {
    expect(formatSignedSignalPp(0.4132)).toBe("+41.32 pp");
    expect(formatSignedSignalPp(-0.025)).toBe("-2.50 pp");
    expect(formatSignedSignalPp(0)).toBe("+0.00 pp");
  });
});
