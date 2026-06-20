import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/server/rateLimiter";

describe("createRateLimiter", () => {
  it("allows up to max requests then blocks within the window", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 3 });
    expect(rl.check("a")).toBe(true);
    expect(rl.check("a")).toBe(true);
    expect(rl.check("a")).toBe(true);
    expect(rl.check("a")).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1 });
    expect(rl.check("a")).toBe(true);
    expect(rl.check("b")).toBe(true);
    expect(rl.check("a")).toBe(false);
    expect(rl.check("b")).toBe(false);
  });

  it("resets the count after the window elapses", () => {
    let t = 0;
    const rl = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(rl.check("a")).toBe(true);
    expect(rl.check("a")).toBe(false);
    t = 1001;
    expect(rl.check("a")).toBe(true);
  });
});
