import type { ReactElement } from "react";

// ── Formats ───────────────────────────────────────────────────────────────────

export type Format = "square" | "story" | "wide";

export interface FormatSpec {
  width: number;
  height: number;
}

export const FORMATS: Record<Format, FormatSpec> = {
  square: { width: 1200, height: 1200 },
  story:  { width: 1080, height: 1920 },
  wide:   { width: 1200, height: 675  },
};

// ── Template registry ─────────────────────────────────────────────────────────

export const KNOWN_TEMPLATES = [
  "head-to-head",
  "hot-takes",
  "taste-nemesis",
  "divisive-item",
  "archetype",
] as const;
export type TemplateName = (typeof KNOWN_TEMPLATES)[number];

// Each template file exports one object conforming to this interface.
// handler() fetches its own data and returns the JSX element to render.
// Adding a new card format = one new file + one entry in renderer.ts.
export interface TemplateModule {
  handler(params: URLSearchParams, format: Format): Promise<ReactElement>;
}

// ── Per-template data shapes ──────────────────────────────────────────────────
// Defined here so the route handler can assemble data independently of the
// template rendering (useful for tests and future pre-computation).

export interface HeadToHeadData {
  alignmentPct: number;
  creatorHandle: string | null; // null → show "the creator"
  listName: string;
  // null when max distance < 2, or when alignment is perfect
  biggestGap: { itemName: string; yourTier: string; theirTier: string } | null;
  // for the fallback callout when biggestGap is null
  perfectMatches: number;
  totalRanked: number;
  shareUrl: string;
}

export interface HotTakesData {
  listName: string;
  rankerCount: number;
  takes: Array<{
    itemName: string;
    yourTier: string;
    crowdTier: string;
    delta: number; // positive = you ranked higher than crowd
  }>;
  shareUrl: string;
}

export interface TasteNemesisData {
  listName: string;
  nemesisHandle: string;
  nemesisAvatarColor: string;
  alignmentPct: number;
  disagreedCount: number;
  totalCount: number;
  shareUrl: string;
}

export interface ArchetypeCardData {
  archetypeName: string;
  tagline: string;
  color: string;
  statLine: string;
  evidence: Array<{
    itemName: string;
    listName: string;
    yourTier: string;
    crowdTier: string;
    delta: number;
  }>;
  rankedItemCount: number;
  rankedListCount: number;
}

export interface DivisiveItemData {
  listName: string;
  itemName: string;
  rankerCount: number;
  /** Per-tier distribution — ordered S→F. Only tiers with value > 0. */
  distribution: Array<{
    tierTitle: string;
    tierColor: string; // raw color from DB, used when title isn't in TIER_COLORS
    tierValue: number;
    count: number;
    maxCount: number; // for normalizing histogram bar heights
  }>;
  shareUrl: string;
}
