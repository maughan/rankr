import { describe, it, expect } from "vitest";
import { freshAnonToken, anonSessionCookieAttrs } from "@/lib/anonSession";

// ── freshAnonToken ────────────────────────────────────────────────────────────

describe("freshAnonToken", () => {
  it("returns a 32-character string", () => {
    expect(freshAnonToken()).toHaveLength(32);
  });

  it("matches the base64url alphabet (no +, /, or = padding)", () => {
    const token = freshAnonToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("generates unique tokens across calls", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => freshAnonToken()));
    expect(tokens.size).toBe(20);
  });
});

// ── anonSessionCookieAttrs ────────────────────────────────────────────────────

describe("anonSessionCookieAttrs", () => {
  const token = "abcdefghijklmnopqrstuvwxyz012345";

  it("uses the correct cookie name", () => {
    expect(anonSessionCookieAttrs(token).name).toBe("rankr_anon_session");
  });

  it("stores the provided token as the value", () => {
    expect(anonSessionCookieAttrs(token).value).toBe(token);
  });

  it("sets httpOnly to true", () => {
    expect(anonSessionCookieAttrs(token).httpOnly).toBe(true);
  });

  it("sets sameSite to 'lax'", () => {
    expect(anonSessionCookieAttrs(token).sameSite).toBe("lax");
  });

  it("sets path to '/'", () => {
    expect(anonSessionCookieAttrs(token).path).toBe("/");
  });

  it("sets maxAge to 1 year in seconds", () => {
    expect(anonSessionCookieAttrs(token).maxAge).toBe(60 * 60 * 24 * 365);
  });

  it("sets secure based on NODE_ENV", () => {
    // In vitest NODE_ENV is "test", not "production" — secure should be false
    expect(anonSessionCookieAttrs(token).secure).toBe(false);
  });
});
