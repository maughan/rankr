import { describe, it, expect } from "vitest";
import { coverColorsFromItems, divisivenessLabel, tierStripFromPlacements } from "@/lib/server/feedCards";

const tiers = [
  { title: "S", value: 6 }, { title: "A", value: 5 }, { title: "B", value: 4 },
  { title: "C", value: 3 }, { title: "D", value: 2 }, { title: "F", value: 1 },
];

describe("coverColorsFromItems", () => {
  it("takes the first N non-null colors", () => {
    expect(coverColorsFromItems([{ color: "#111" }, { color: null }, { color: "#222" }], 2)).toEqual(["#111", "#222"]);
  });
  it("falls back to a palette when none", () => {
    expect(coverColorsFromItems([{ color: null }], 3).length).toBe(3);
  });
});

describe("divisivenessLabel", () => {
  it("classifies by avg sd", () => {
    expect(divisivenessLabel(0)).toBe("calm");
    expect(divisivenessLabel(1.0)).toBe("spicy");
    expect(divisivenessLabel(2.0)).toBe("divisive");
  });
});

describe("tierStripFromPlacements", () => {
  it("counts items into their consensus tier (avg rounded), excludes value 0 and unranked", () => {
    const items = [
      { rankings: [{ value: 6 }, { value: 6 }] },
      { rankings: [{ value: 5 }, { value: 5 }] },
      { rankings: [{ value: 6 }, { value: 4 }] },
      { rankings: [{ value: 0 }] },
      { rankings: [] },
    ];
    const strip = tierStripFromPlacements(items, tiers);
    const byTitle = Object.fromEntries(strip.map((s) => [s.tierTitle, s.itemCount]));
    expect(byTitle.S).toBe(1);
    expect(byTitle.A).toBe(2);
    expect(byTitle.B).toBe(0);
    expect(strip.find((s) => s.value === 0)).toBeUndefined();
    expect(strip).toHaveLength(6);
  });
});
