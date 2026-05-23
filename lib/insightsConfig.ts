// Statistical gating and badge thresholds for comparison insights.
// Tunable without code edits — change here and all three features update.

/** Minimum number of rankers on a list before any insight is shown. */
export const MIN_RANKERS_FOR_INSIGHTS = 5;

/**
 * Minimum number of rankings for a single item before an agreement badge
 * is shown. Below this, the percentage would be too noisy to trust.
 */
export const MIN_ITEM_RANKERS_FOR_BADGE = 3;

/**
 * Minimum number of OTHER authed rankers needed to compute a taste nemesis.
 * With only 1 other ranker the nemesis is trivially the only candidate.
 */
export const MIN_OTHER_AUTHED_RANKERS_FOR_NEMESIS = 2;

/** Agreement badge thresholds (inclusive lower bound, %). */
export const AGREEMENT_THRESHOLDS = {
  high: 60,
  mid: 20,
  rare: 1,
  // 0% → "unique"
} as const;

export type AgreementTier = "high" | "mid" | "rare" | "unique";

export function classifyAgreement(pct: number, totalRankers: number): AgreementTier {
  if (totalRankers === 0 || pct === 0) return "unique";
  if (pct >= AGREEMENT_THRESHOLDS.high) return "high";
  if (pct >= AGREEMENT_THRESHOLDS.mid) return "mid";
  return "rare";
}
