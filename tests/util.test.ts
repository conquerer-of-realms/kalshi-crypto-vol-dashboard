import { describe, expect, it } from "vitest";
import { processIndependently, roundOrNull, toFiniteOrNull } from "../scripts/util.ts";

describe("processIndependently", () => {
  it("isolates one item's failure so it does not destroy the others' results", async () => {
    const items = ["BTC", "BROKEN", "ETH", "SOL"];

    const { successes, failures } = await processIndependently(items, async (symbol) => {
      if (symbol === "BROKEN") throw new Error("upstream API error");
      return `${symbol}-ok`;
    });

    expect(failures).toHaveLength(1);
    expect(failures[0]?.item).toBe("BROKEN");
    expect(failures[0]?.error).toContain("upstream API error");

    const succeededItems = successes.map((s) => s.item).sort();
    expect(succeededItems).toEqual(["BTC", "ETH", "SOL"]);
  });

  it("handles all items failing without throwing", async () => {
    const { successes, failures } = await processIndependently([1, 2, 3], async () => {
      throw new Error("always fails");
    });
    expect(successes).toHaveLength(0);
    expect(failures).toHaveLength(3);
  });

  it("handles all items succeeding", async () => {
    const { successes, failures } = await processIndependently([1, 2, 3], async (n) => n * 2);
    expect(failures).toHaveLength(0);
    expect(successes.map((s) => s.result).sort()).toEqual([2, 4, 6]);
  });
});

describe("toFiniteOrNull", () => {
  it("passes through finite numbers", () => {
    expect(toFiniteOrNull(1.5)).toBe(1.5);
    expect(toFiniteOrNull(0)).toBe(0);
  });

  it("converts NaN, Infinity, and non-numbers to null", () => {
    expect(toFiniteOrNull(NaN)).toBeNull();
    expect(toFiniteOrNull(Infinity)).toBeNull();
    expect(toFiniteOrNull(-Infinity)).toBeNull();
    expect(toFiniteOrNull("5")).toBeNull();
    expect(toFiniteOrNull(undefined)).toBeNull();
    expect(toFiniteOrNull(null)).toBeNull();
  });
});

describe("roundOrNull", () => {
  it("rounds finite numbers and preserves null", () => {
    expect(roundOrNull(0.123456789, 4)).toBeCloseTo(0.1235, 10);
    expect(roundOrNull(null)).toBeNull();
  });

  it("treats non-finite input as null rather than fabricating a value", () => {
    expect(roundOrNull(NaN)).toBeNull();
    expect(roundOrNull(Infinity)).toBeNull();
  });
});
