import { describe, it, expect } from "vitest";
import { scoreRankerPair } from "@/lib/server/payoff";

// ── scoreRankerPair ───────────────────────────────────────────────────────────
// Rules:
//   "within"  — |myValue - theirValue| <= 1  (adjacent tiers count as aligned)
//   "agreed"  — values are exactly equal
//   "both"    — items ranked by both people (intersection)

describe("scoreRankerPair", () => {
  it("returns zeros when there is no overlap between the two value maps", () => {
    const mine = new Map([[1, 8], [2, 6]]);
    const theirs = new Map([[3, 8], [4, 4]]);
    expect(scoreRankerPair(mine, theirs)).toEqual({ within: 0, agreed: 0, both: 0 });
  });

  it("counts an item as agreed and within when values are identical", () => {
    const mine = new Map([[1, 8]]);
    const theirs = new Map([[1, 8]]);
    expect(scoreRankerPair(mine, theirs)).toEqual({ within: 1, agreed: 1, both: 1 });
  });

  it("counts an item as within-but-not-agreed when values differ by exactly 1", () => {
    const mine = new Map([[1, 8]]);
    const theirs = new Map([[1, 6]]); // 8 - 6 = 2? No, let's use adjacent values
    // Tier values are 8, 6, 4, 2 … diff of 2 is NOT within one tier
    // Use 8 vs 7? Values in the app are 8,6,4,2 — but the function just does |a-b| <= 1
    // So test with values 5 and 6:
    const mine2 = new Map([[1, 6]]);
    const theirs2 = new Map([[1, 7]]);
    expect(scoreRankerPair(mine2, theirs2)).toEqual({ within: 1, agreed: 0, both: 1 });
  });

  it("does not count as within when values differ by more than 1", () => {
    const mine = new Map([[1, 8]]);
    const theirs = new Map([[1, 6]]); // diff = 2
    expect(scoreRankerPair(mine, theirs)).toEqual({ within: 0, agreed: 0, both: 1 });
  });

  it("only counts items present in both maps", () => {
    const mine = new Map([[1, 8], [2, 6], [3, 4]]);
    const theirs = new Map([[1, 8], [3, 5]]); // only items 1 and 3 overlap
    const result = scoreRankerPair(mine, theirs);
    expect(result.both).toBe(2);
    expect(result.agreed).toBe(1); // item 1: 8===8
    expect(result.within).toBe(2); // item 1: |8-8|=0 ✓, item 3: |4-5|=1 ✓
  });

  it("handles a perfect agreement across all shared items", () => {
    const mine = new Map([[10, 8], [20, 6], [30, 4]]);
    const theirs = new Map([[10, 8], [20, 6], [30, 4]]);
    expect(scoreRankerPair(mine, theirs)).toEqual({ within: 3, agreed: 3, both: 3 });
  });

  it("handles complete disagreement with no within-one items", () => {
    // Values differ by 2+ on every shared item
    const mine = new Map([[1, 8], [2, 8]]);
    const theirs = new Map([[1, 4], [2, 4]]); // diffs: 4 and 4
    expect(scoreRankerPair(mine, theirs)).toEqual({ within: 0, agreed: 0, both: 2 });
  });

  it("agreed is always <= within", () => {
    const mine = new Map([[1, 8], [2, 6], [3, 4]]);
    const theirs = new Map([[1, 8], [2, 7], [3, 2]]);
    const { within, agreed, both } = scoreRankerPair(mine, theirs);
    expect(agreed).toBeLessThanOrEqual(within);
    expect(within).toBeLessThanOrEqual(both);
  });

  it("ignores items in their map that the viewer did not rank", () => {
    const mine = new Map([[1, 8]]);
    const theirs = new Map([[1, 8], [99, 6]]); // item 99 not in viewer's map
    expect(scoreRankerPair(mine, theirs)).toEqual({ within: 1, agreed: 1, both: 1 });
  });
});
