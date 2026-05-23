import { describe, it, expect } from "vitest";
import {
  classifyAgreement,
  AGREEMENT_THRESHOLDS,
  MIN_RANKERS_FOR_INSIGHTS,
  MIN_ITEM_RANKERS_FOR_BADGE,
  MIN_OTHER_AUTHED_RANKERS_FOR_NEMESIS,
  type AgreementTier,
} from "@/lib/insightsConfig";

// ── classifyAgreement ─────────────────────────────────────────────────────────

describe("classifyAgreement", () => {
  describe("unique — nobody else put it in the same tier", () => {
    it("returns unique when pct is 0", () => {
      expect(classifyAgreement(0, 10)).toBe<AgreementTier>("unique");
    });

    it("returns unique when totalRankers is 0 regardless of pct", () => {
      expect(classifyAgreement(0, 0)).toBe<AgreementTier>("unique");
    });
  });

  describe("rare — 1–19%", () => {
    it("returns rare at the lower boundary (1%)", () => {
      expect(classifyAgreement(1, 10)).toBe<AgreementTier>("rare");
    });

    it("returns rare at a typical low value (10%)", () => {
      expect(classifyAgreement(10, 10)).toBe<AgreementTier>("rare");
    });

    it("returns rare at the upper boundary (19%)", () => {
      expect(classifyAgreement(19, 10)).toBe<AgreementTier>("rare");
    });
  });

  describe("mid — 20–59%", () => {
    it("returns mid at the lower boundary (20%)", () => {
      expect(classifyAgreement(20, 10)).toBe<AgreementTier>("mid");
    });

    it("returns mid at a typical mid value (40%)", () => {
      expect(classifyAgreement(40, 10)).toBe<AgreementTier>("mid");
    });

    it("returns mid at the upper boundary (59%)", () => {
      expect(classifyAgreement(59, 10)).toBe<AgreementTier>("mid");
    });
  });

  describe("high — 60%+", () => {
    it("returns high at the lower boundary (60%)", () => {
      expect(classifyAgreement(60, 10)).toBe<AgreementTier>("high");
    });

    it("returns high at a typical value (80%)", () => {
      expect(classifyAgreement(80, 10)).toBe<AgreementTier>("high");
    });

    it("returns high at 100%", () => {
      expect(classifyAgreement(100, 10)).toBe<AgreementTier>("high");
    });
  });

  describe("threshold alignment with AGREEMENT_THRESHOLDS constants", () => {
    it("high boundary matches AGREEMENT_THRESHOLDS.high", () => {
      expect(classifyAgreement(AGREEMENT_THRESHOLDS.high, 10)).toBe<AgreementTier>("high");
      expect(classifyAgreement(AGREEMENT_THRESHOLDS.high - 1, 10)).toBe<AgreementTier>("mid");
    });

    it("mid boundary matches AGREEMENT_THRESHOLDS.mid", () => {
      expect(classifyAgreement(AGREEMENT_THRESHOLDS.mid, 10)).toBe<AgreementTier>("mid");
      expect(classifyAgreement(AGREEMENT_THRESHOLDS.mid - 1, 10)).toBe<AgreementTier>("rare");
    });

    it("rare boundary matches AGREEMENT_THRESHOLDS.rare", () => {
      expect(classifyAgreement(AGREEMENT_THRESHOLDS.rare, 10)).toBe<AgreementTier>("rare");
      expect(classifyAgreement(AGREEMENT_THRESHOLDS.rare - 1, 10)).toBe<AgreementTier>("unique");
    });
  });
});

// ── Gate constants — sanity-check that defaults haven't drifted ──────────────

describe("gate constants", () => {
  it("MIN_RANKERS_FOR_INSIGHTS is at least 2", () => {
    expect(MIN_RANKERS_FOR_INSIGHTS).toBeGreaterThanOrEqual(2);
  });

  it("MIN_ITEM_RANKERS_FOR_BADGE is at least 1", () => {
    expect(MIN_ITEM_RANKERS_FOR_BADGE).toBeGreaterThanOrEqual(1);
  });

  it("MIN_OTHER_AUTHED_RANKERS_FOR_NEMESIS is at least 2", () => {
    expect(MIN_OTHER_AUTHED_RANKERS_FOR_NEMESIS).toBeGreaterThanOrEqual(2);
  });

  it("MIN_ITEM_RANKERS_FOR_BADGE does not exceed MIN_RANKERS_FOR_INSIGHTS", () => {
    expect(MIN_ITEM_RANKERS_FOR_BADGE).toBeLessThanOrEqual(MIN_RANKERS_FOR_INSIGHTS);
  });
});
