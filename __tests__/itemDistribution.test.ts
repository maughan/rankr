import { describe, it, expect } from "vitest";
import { computeItemDistribution, divisiveness } from "@/lib/itemDistribution";

const tiers = [
  { title: "S", value: 6 },
  { title: "A", value: 5 },
  { title: "B", value: 4 },
  { title: "C", value: 3 },
  { title: "D", value: 2 },
  { title: "F", value: 1 },
];

describe("computeItemDistribution", () => {
  it("unanimous item → sd 0, 100% in one tier", () => {
    const r = computeItemDistribution(new Map([[6, 8]]), tiers);
    expect(r.total).toBe(8);
    expect(r.sd).toBe(0);
    const s = r.distribution.find((d) => d.value === 6)!;
    expect(s.count).toBe(8);
    expect(s.pct).toBe(100);
  });

  it("a far split (S vs F) is more divisive than an adjacent split (S vs A)", () => {
    const far = computeItemDistribution(new Map([[6, 5], [1, 5]]), tiers);
    const near = computeItemDistribution(new Map([[6, 5], [5, 5]]), tiers);
    expect(far.sd).toBeGreaterThan(near.sd);
  });

  it("pct values reflect the split", () => {
    const r = computeItemDistribution(new Map([[6, 3], [5, 1]]), tiers);
    expect(r.total).toBe(4);
    expect(r.distribution.find((d) => d.value === 6)!.pct).toBe(75);
    expect(r.distribution.find((d) => d.value === 5)!.pct).toBe(25);
  });

  it("empty → total 0, sd 0, all counts 0", () => {
    const r = computeItemDistribution(new Map(), tiers);
    expect(r.total).toBe(0);
    expect(r.sd).toBe(0);
    expect(r.distribution.every((d) => d.count === 0 && d.pct === 0)).toBe(true);
    expect(r.distribution).toHaveLength(6);
  });
});

describe("divisiveness", () => {
  it("classifies by thresholds", () => {
    expect(divisiveness(0)).toBe("low");
    expect(divisiveness(1.0)).toBe("mid");
    expect(divisiveness(2.0)).toBe("high");
  });

  it("treats threshold boundaries as inclusive", () => {
    expect(divisiveness(0.8)).toBe("mid");
    expect(divisiveness(1.3)).toBe("high");
  });
});
