import { describe, it, expect } from "vitest";
import { getClientIp, hashIp } from "@/lib/ipHash";

function makeRequest(headers: Record<string, string>): Request {
  return new Request("https://example.com", { headers });
}

// ── getClientIp ───────────────────────────────────────────────────────────────

describe("getClientIp", () => {
  it("returns the first IP from x-forwarded-for when multiple are present", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns the single IP from x-forwarded-for when there is no comma", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from the x-forwarded-for value", () => {
    const req = makeRequest({ "x-forwarded-for": "  1.2.3.4  " });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = makeRequest({ "x-real-ip": "9.8.7.6" });
    expect(getClientIp(req)).toBe("9.8.7.6");
  });

  it("returns 'unknown' when neither header is present", () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = makeRequest({
      "x-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
    });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });
});

// ── hashIp ────────────────────────────────────────────────────────────────────

describe("hashIp", () => {
  it("returns a 16-character hex string", () => {
    const result = hashIp("1.2.3.4");
    expect(result).toHaveLength(16);
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic — same IP always produces same hash", () => {
    expect(hashIp("1.2.3.4")).toBe(hashIp("1.2.3.4"));
  });

  it("produces different hashes for different IPs", () => {
    expect(hashIp("1.2.3.4")).not.toBe(hashIp("5.6.7.8"));
  });

  it("hashes 'unknown' without throwing", () => {
    expect(() => hashIp("unknown")).not.toThrow();
    expect(hashIp("unknown")).toHaveLength(16);
  });
});
