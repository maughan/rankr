import { describe, it, expect } from "vitest";
import { buildReveal } from "@/lib/server/reveal";
import type { PayoffData } from "@/lib/server/payoff";

const payoff = {
  alignment: { pct: 72, withinOneTier: 0, perfectMatches: 0, rankerCount: 40 },
  hottestTake: null,
} as unknown as PayoffData;

describe("buildReveal", () => {
  it("computes vsSharerPct from within/both and keeps the handle", () => {
    const r = buildReveal({ payoff, vsSharer: { within: 8, both: 10 }, sharerHandle: "rhys" });
    expect(r.vsSharerPct).toBe(80);
    expect(r.sharerHandle).toBe("rhys");
    expect(r.vsCrowdPct).toBe(72);
    expect(r.rankerCount).toBe(40);
  });

  it("hides the sharer when there is no overlap (both === 0)", () => {
    const r = buildReveal({ payoff, vsSharer: { within: 0, both: 0 }, sharerHandle: "rhys" });
    expect(r.vsSharerPct).toBeNull();
    expect(r.sharerHandle).toBeNull();
  });

  it("hides the sharer when there are no sharer rankings (null)", () => {
    const r = buildReveal({ payoff, vsSharer: null, sharerHandle: "rhys" });
    expect(r.vsSharerPct).toBeNull();
    expect(r.sharerHandle).toBeNull();
  });
});
