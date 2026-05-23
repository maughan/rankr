import { describe, it, expect } from "vitest";
import {
  slugify,
  isValidShortId,
  parseSlugParam,
  listUrl,
  generateShortId,
} from "@/lib/listUrl";

// ── slugify ───────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips accents from characters", () => {
    expect(slugify("Héros & Café")).toBe("heros-cafe");
  });

  it("collapses multiple consecutive non-alphanumeric chars into one hyphen", () => {
    expect(slugify("foo   ---   bar")).toBe("foo-bar");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --foo bar--  ")).toBe("foo-bar");
  });

  it("returns 'list' for an empty or whitespace-only string", () => {
    expect(slugify("")).toBe("list");
    expect(slugify("   ")).toBe("list");
  });

  it("returns 'list' for a string that has only special chars", () => {
    expect(slugify("!!!")).toBe("list");
  });

  it("truncates at 60 chars on a word boundary", () => {
    const long = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda";
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result).not.toMatch(/-$/);
  });

  it("preserves a string already under 60 chars unchanged", () => {
    expect(slugify("short-title")).toBe("short-title");
  });
});

// ── isValidShortId ────────────────────────────────────────────────────────────

describe("isValidShortId", () => {
  it("accepts an 8-char string from the allowed alphabet", () => {
    expect(isValidShortId("aBcXyZ23")).toBe(true);
  });

  it("rejects a string shorter than 8 chars", () => {
    expect(isValidShortId("aBcXyZ2")).toBe(false);
  });

  it("rejects a string longer than 8 chars", () => {
    expect(isValidShortId("aBcXyZ234")).toBe(false);
  });

  it("rejects the ambiguous chars 0, O, I, l, 1", () => {
    expect(isValidShortId("0BcXyZ23")).toBe(false);
    expect(isValidShortId("OBcXyZ23")).toBe(false);
    expect(isValidShortId("IBcXyZ23")).toBe(false);
    expect(isValidShortId("lBcXyZ23")).toBe(false);
    expect(isValidShortId("1BcXyZ23")).toBe(false);
  });

  it("rejects special characters", () => {
    expect(isValidShortId("aBcXyZ!@")).toBe(false);
  });
});

// ── generateShortId ───────────────────────────────────────────────────────────

describe("generateShortId", () => {
  it("generates an 8-character string", () => {
    expect(generateShortId()).toHaveLength(8);
  });

  it("generates a valid short id", () => {
    expect(isValidShortId(generateShortId())).toBe(true);
  });

  it("generates unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateShortId()));
    expect(ids.size).toBe(20);
  });
});

// ── parseSlugParam ────────────────────────────────────────────────────────────

describe("parseSlugParam", () => {
  it("extracts shortId from a slug-prefixed param", () => {
    const result = parseSlugParam("chocolate-bars-aBcXyZ23");
    expect(result).toEqual({ shortId: "aBcXyZ23", slug: "chocolate-bars" });
  });

  it("handles a bare shortId with no slug prefix", () => {
    const result = parseSlugParam("aBcXyZ23");
    expect(result).toEqual({ shortId: "aBcXyZ23", slug: "" });
  });

  it("returns null when the string is shorter than the short id length", () => {
    expect(parseSlugParam("abc")).toBeNull();
  });

  it("returns null when the last 8 chars are not a valid short id", () => {
    // Contains '0' which is forbidden
    expect(parseSlugParam("some-slug-00000000")).toBeNull();
  });

  it("handles single-word slug prefix correctly", () => {
    const result = parseSlugParam("lists-aBcXyZ23");
    expect(result?.shortId).toBe("aBcXyZ23");
    expect(result?.slug).toBe("lists");
  });
});

// ── listUrl ───────────────────────────────────────────────────────────────────

describe("listUrl", () => {
  it("combines slug and short_id with a hyphen prefix", () => {
    expect(listUrl({ slug: "my-list", short_id: "aBcXyZ23" })).toBe("/s/my-list-aBcXyZ23");
  });

  it("falls back to 'list' when slug is null", () => {
    expect(listUrl({ slug: null, short_id: "aBcXyZ23" })).toBe("/s/list-aBcXyZ23");
  });
});
