import { describe, it, expect } from "vitest";
import { nameToColor, deriveShortLabel } from "@/lib/itemColor";

// ── nameToColor ───────────────────────────────────────────────────────────────

describe("nameToColor", () => {
  it("returns a hex color string", () => {
    const color = nameToColor("Sonic the Hedgehog");
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is deterministic — same name always yields same color", () => {
    expect(nameToColor("Pizza")).toBe(nameToColor("Pizza"));
  });

  it("produces different colors for different names", () => {
    expect(nameToColor("Alpha")).not.toBe(nameToColor("Beta"));
  });

  it("handles an empty string without throwing", () => {
    expect(() => nameToColor("")).not.toThrow();
    expect(nameToColor("")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("handles single-character names", () => {
    expect(nameToColor("A")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// ── deriveShortLabel ──────────────────────────────────────────────────────────

describe("deriveShortLabel", () => {
  describe("multi-word names → initials", () => {
    it("returns initials of first two words", () => {
      expect(deriveShortLabel("Iron Man")).toBe("IM");
    });

    it("returns initials of first three words (capped at 3)", () => {
      expect(deriveShortLabel("The Dark Knight")).toBe("TDK");
    });

    it("uses only the first three words when more are present", () => {
      expect(deriveShortLabel("One Two Three Four Five")).toBe("OTT");
    });

    it("uppercases initials", () => {
      expect(deriveShortLabel("hello world")).toBe("HW");
    });
  });

  describe("single-word names → consonant compression", () => {
    it("keeps first char and consonants up to 3 total", () => {
      // "Sonic" → S, n, c → "SNC"
      expect(deriveShortLabel("Sonic")).toBe("SNC");
    });

    it("handles a word that starts with a vowel", () => {
      // "Apple" → A (index 0), p, p → "APP"
      expect(deriveShortLabel("Apple")).toBe("APP");
    });

    it("returns uppercased result", () => {
      expect(deriveShortLabel("tiger")).toBe("TGR");
    });

    it("returns all available chars if the word is very short", () => {
      // "Hi" → H (index 0), no non-vowels at index>0 except nothing → "H"
      expect(deriveShortLabel("Hi")).toBe("H");
    });

    it("handles a single character", () => {
      expect(deriveShortLabel("A")).toBe("A");
    });
  });

  describe("edge cases", () => {
    it("trims surrounding whitespace before processing", () => {
      expect(deriveShortLabel("  Iron Man  ")).toBe("IM");
    });
  });
});
