import { describe, it, expect } from "vitest";
import { cloneTitle } from "@/lib/listUrl";

describe("cloneTitle", () => {
  it("prefixes 'Copy of' for a normal clone", () => {
    const r = cloneTitle("Chocolate bars", false);
    expect(r.title).toBe("Copy of Chocolate bars");
    expect(r.slug).toBe("copy-of-chocolate-bars");
  });

  it("uses the source title verbatim for a template clone", () => {
    const r = cloneTitle("Chocolate bars", true);
    expect(r.title).toBe("Chocolate bars");
    expect(r.slug).toBe("chocolate-bars");
  });
});
