// Statistical gating and badge thresholds for comparison insights and archetypes.
// Tunable without code edits — change here and all features update.

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

export const DIVISIVE_SD_MID = 0.8;
export const DIVISIVE_SD_HIGH = 1.3;

// ── Archetype ─────────────────────────────────────────────────────────────────

export const MIN_SHARED_ITEMS_FOR_MATCH = 10;
export const MIN_SHARED_LISTS_FOR_MATCH = 2;
export const MAX_MATCH_CANDIDATES = 500;
export const MAX_DISCOVER_MATCHES = 10;

/** Minimum ranked items across all lists before an archetype is assigned. */
export const MIN_ITEMS_FOR_ARCHETYPE = 20;

/** Minimum distinct lists ranked before an archetype is assigned. */
export const MIN_LISTS_FOR_ARCHETYPE = 3;

/**
 * Maximum number of evidence receipts stored in archetype_stats and shown
 * on the share card / detail view.
 */
export const ARCHETYPE_EVIDENCE_COUNT = 3;

/**
 * How many top-tier values (counted from the highest value down) are
 * considered "extreme high" for the extremeRatio and generosity signals.
 * With 6 tiers (S=8,A=6,B=4,C=2,D=-2,F=-4 or similar), top 1 = S only.
 */
export const EXTREME_TIER_COUNT = 1;

/**
 * Absolute signal thresholds for archetype classification.
 * Each value is an inclusive lower bound (fraction 0–1 or percentage 0–100
 * depending on the signal). These are designed to be replaced by population-
 * relative percentiles once enough users exist; the raw signal values are
 * always stored in archetype_stats for retroactive reclassification.
 */
export const ARCHETYPE_THRESHOLDS = {
  /** avgAlignment below this → Contrarian (fraction 0–1). */
  contrarianMaxAlignment: 0.45,
  /** avgAlignment at or above this → Oracle (fraction 0–1). */
  oracleMinAlignment: 0.75,
  /** extremeRatio at or above this → Purist (fraction 0–1). */
  puristMinExtremeRatio: 0.50,
  /** middleRatio at or above this → Diplomat (fraction 0–1). */
  diplomatMinMiddleRatio: 0.65,
  /** generosity (mean tier position, normalised 0–1) at or above this → Enthusiast. */
  enthusiastMinGenerosity: 0.70,
  /** harshness (inverse of generosity) at or above this → Critic. */
  criticMinHarshness: 0.65,
} as const;

export type ArchetypeSlug =
  | "contrarian"
  | "oracle"
  | "purist"
  | "diplomat"
  | "enthusiast"
  | "critic"
  | "wildcard";

/**
 * Returns the most relevant signal for a given archetype as a 0–100 integer,
 * suitable for the statLine template and share card display.
 */
export function archetypeStatPct(
  archetype: ArchetypeSlug,
  signals: ArchetypeStats["signals"]
): number {
  switch (archetype) {
    case "contrarian": return Math.round((1 - signals.avgAlignment) * 100);
    case "oracle":     return Math.round(signals.avgAlignment * 100);
    case "purist":     return Math.round(signals.extremeRatio * 100);
    case "diplomat":   return Math.round(signals.middleRatio * 100);
    case "enthusiast": return Math.round(signals.generosity * 100);
    case "critic":     return Math.round(signals.harshness * 100);
    case "wildcard":   return 0;
  }
}

/** One hot-take receipt stored as evidence for the archetype. */
export interface ArchetypeReceipt {
  itemName: string;
  listName: string;
  yourTier: string;
  crowdTier: string;
  delta: number; // signed: positive = you ranked higher than crowd
}

/** Shape of the archetype_stats JSON column on User. */
export interface ArchetypeStats {
  signals: {
    /** Mean fraction of rankings within 1 tier of crowd consensus (0–1). */
    avgAlignment: number;
    /** Fraction of rankings placed in the top or bottom tier (0–1). */
    extremeRatio: number;
    /** Fraction of rankings placed in middle tiers B/C/D (0–1). */
    middleRatio: number;
    /** Mean normalised tier position (0 = lowest tier, 1 = highest). */
    generosity: number;
    /** Inverse of generosity — mean skew toward bottom (0–1). */
    harshness: number;
    /** Population-normalised spread of the user's own tier choices (0–1). */
    selfVariance: number;
  };
  evidence: ArchetypeReceipt[];
  rankedItemCount: number;
  rankedListCount: number;
}
