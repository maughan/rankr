import { describe, it, expect } from "vitest";
import { pickTwinNemesis, buildPairwise, topMatches, TasteMatchCandidate } from "@/lib/server/tasteMatch";

const cand = (over: Partial<TasteMatchCandidate>): TasteMatchCandidate => ({
  userId: 1, username: "u", displayName: null, within: 0, both: 0, sharedLists: 0, ...over,
});

describe("pickTwinNemesis", () => {
  it("picks max-pct twin and min-pct nemesis among qualifiers", () => {
    const cands = [
      cand({ userId: 1, username: "high", within: 18, both: 20, sharedLists: 3 }),
      cand({ userId: 2, username: "low", within: 5, both: 20, sharedLists: 3 }),
      cand({ userId: 3, username: "mid", within: 12, both: 20, sharedLists: 3 }),
    ];
    const r = pickTwinNemesis(cands);
    expect(r.twin?.username).toBe("high");
    expect(r.twin?.pct).toBe(90);
    expect(r.twin?.sharedItems).toBe(20);
    expect(r.nemesis?.username).toBe("low");
    expect(r.nemesis?.pct).toBe(25);
  });

  it("excludes candidates below the shared-items / shared-lists minimums", () => {
    const cands = [
      cand({ userId: 1, username: "fewitems", within: 4, both: 5, sharedLists: 3 }),
      cand({ userId: 2, username: "fewlists", within: 18, both: 20, sharedLists: 1 }),
    ];
    expect(pickTwinNemesis(cands)).toEqual({ twin: null, nemesis: null });
  });

  it("returns nemesis null when only one qualifier (never same person as both)", () => {
    const r = pickTwinNemesis([cand({ userId: 1, username: "solo", within: 15, both: 20, sharedLists: 2 })]);
    expect(r.twin?.username).toBe("solo");
    expect(r.nemesis).toBeNull();
  });

  it("breaks pct ties by higher both (more evidence)", () => {
    const r = pickTwinNemesis([
      cand({ userId: 1, username: "thin", within: 9, both: 10, sharedLists: 2 }),
      cand({ userId: 2, username: "thick", within: 27, both: 30, sharedLists: 3 }),
    ]);
    expect(r.twin?.username).toBe("thick");
  });

  it("empty input → both null", () => {
    expect(pickTwinNemesis([])).toEqual({ twin: null, nemesis: null });
  });
});

describe("buildPairwise", () => {
  it("returns null below the shared-items minimum", () => {
    const a = new Map([[1, 6], [2, 5]]);
    const b = new Map([[1, 6], [2, 5]]);
    expect(buildPairwise(a, b, 2)).toBeNull();
  });

  it("returns pct/sharedItems/sharedLists above thresholds", () => {
    const a = new Map<number, number>();
    const b = new Map<number, number>();
    for (let i = 1; i <= 12; i++) { a.set(i, 5); b.set(i, i <= 9 ? 5 : 1); }
    const r = buildPairwise(a, b, 2);
    expect(r).not.toBeNull();
    expect(r!.sharedItems).toBe(12);
    expect(r!.pct).toBe(75);
    expect(r!.sharedLists).toBe(2);
  });

  it("returns null below the shared-lists minimum", () => {
    const a = new Map<number, number>(); const b = new Map<number, number>();
    for (let i = 1; i <= 12; i++) { a.set(i, 5); b.set(i, 5); }
    expect(buildPairwise(a, b, 1)).toBeNull();
  });
});

describe("topMatches", () => {
  it("returns qualifiers sorted by pct desc, capped to the limit", () => {
    const cands = [
      cand({ userId: 1, username: "a", within: 10, both: 20, sharedLists: 2 }),
      cand({ userId: 2, username: "b", within: 18, both: 20, sharedLists: 2 }),
      cand({ userId: 3, username: "c", within: 14, both: 20, sharedLists: 2 }),
    ];
    const r = topMatches(cands, 2);
    expect(r.map((m) => m.username)).toEqual(["b", "c"]);
    expect(r[0].pct).toBe(90);
  });

  it("excludes candidates below the thresholds", () => {
    const cands = [
      cand({ userId: 1, username: "fewitems", within: 4, both: 5, sharedLists: 3 }),
      cand({ userId: 2, username: "fewlists", within: 18, both: 20, sharedLists: 1 }),
    ];
    expect(topMatches(cands, 10)).toEqual([]);
  });

  it("breaks pct ties by more shared items", () => {
    const r = topMatches([
      cand({ userId: 1, username: "thin", within: 9, both: 10, sharedLists: 2 }),
      cand({ userId: 2, username: "thick", within: 27, both: 30, sharedLists: 3 }),
    ], 10);
    expect(r[0].username).toBe("thick");
  });

  it("empty input → []", () => {
    expect(topMatches([], 10)).toEqual([]);
  });
});
