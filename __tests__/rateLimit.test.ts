import { describe, it, expect } from "vitest";
import { rateLimitKey, checkRateLimit } from "@/lib/rateLimit";

// Use unique keys per test to avoid cross-test state pollution in the shared store.
let counter = 0;
function freshKey() {
  return `testip:testsession:${counter++}`;
}

// ── rateLimitKey ──────────────────────────────────────────────────────────────

describe("rateLimitKey", () => {
  it("produces a colon-delimited string of ipHash:sessionToken:listId", () => {
    expect(rateLimitKey("abcd1234", "tok_abc", 42)).toBe("abcd1234:tok_abc:42");
  });

  it("differentiates keys by listId", () => {
    const a = rateLimitKey("ip", "sess", 1);
    const b = rateLimitKey("ip", "sess", 2);
    expect(a).not.toBe(b);
  });

  it("differentiates keys by sessionToken", () => {
    const a = rateLimitKey("ip", "sess1", 1);
    const b = rateLimitKey("ip", "sess2", 1);
    expect(a).not.toBe(b);
  });

  it("differentiates keys by ipHash", () => {
    const a = rateLimitKey("ip1", "sess", 1);
    const b = rateLimitKey("ip2", "sess", 1);
    expect(a).not.toBe(b);
  });
});

// ── checkRateLimit ────────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  it("allows the first submission and returns remaining=4", () => {
    const result = checkRateLimit(freshKey());
    expect(result).toEqual({ allowed: true, remaining: 4 });
  });

  it("allows up to 5 submissions and tracks remaining correctly", () => {
    const key = freshKey();
    expect(checkRateLimit(key)).toEqual({ allowed: true, remaining: 4 });
    expect(checkRateLimit(key)).toEqual({ allowed: true, remaining: 3 });
    expect(checkRateLimit(key)).toEqual({ allowed: true, remaining: 2 });
    expect(checkRateLimit(key)).toEqual({ allowed: true, remaining: 1 });
    expect(checkRateLimit(key)).toEqual({ allowed: true, remaining: 0 });
  });

  it("blocks the 6th submission", () => {
    const key = freshKey();
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    expect(checkRateLimit(key)).toEqual({ allowed: false, remaining: 0 });
  });

  it("continues blocking after the limit is exceeded", () => {
    const key = freshKey();
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);
    expect(checkRateLimit(key).allowed).toBe(false);
  });

  it("isolates rate limit state per key", () => {
    const keyA = freshKey();
    const keyB = freshKey();
    for (let i = 0; i < 5; i++) checkRateLimit(keyA);
    // keyA is blocked but keyB should still be fresh
    expect(checkRateLimit(keyA).allowed).toBe(false);
    expect(checkRateLimit(keyB).allowed).toBe(true);
  });
});
