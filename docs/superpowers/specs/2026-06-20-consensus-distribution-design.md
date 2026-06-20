# Consensus + per-item distribution — design

## Goal

Turn every item into an argument: in the community view, any item can be
expanded to show how the crowd spread it across tiers ("62% said S, you said
C"), and divisive items are flagged at a glance. Deepens the comparison core and
feeds shareable stats.

## Decisions (locked)

- Reveal a single item's distribution via **inline expand** under the item.
- Flag divisive items with **both** a contention dot on cards and a "most
  divisive" sort.
- **Mark the viewer's own pick** within the distribution.
- Surface on **both** the canonical `/s/` view and the shared `/r/` view.

## Background (reuse / constraints)

- `/s/` `ListDetail` already loads full `item.rankings` and hand-computes a
  per-tier `distribution` + standard deviation for the single most-divisive
  item (`app/(pages)/s/[id]/ListDetail.tsx`). That math will be extracted into a
  shared helper and reused.
- `/r/` is served by `computeListAggregates` (`lib/server/aggregation.ts`),
  which **deliberately excludes individual rankings** ("safe to expose
  publicly") and ships only averaged tier placements. Distribution data must be
  added there as privacy-safe **counts**, never raw rankings.
- `MIN_ITEM_RANKERS_FOR_BADGE = 3` already gates per-item insight surfaces
  (`lib/insightsConfig.ts`).
- Both views already load the viewer's own ranking (`myRanking`) for the "your
  ranking" toggle — the source of the own-pick marker.

## Core helper — `lib/itemDistribution.ts`

Pure, unit-tested. Lives in `lib/` (not `lib/server/`) because both the server
aggregation path and the `/s/` client path import it; it has no server-only
deps. Takes **counts** (a `value -> count` map) so both data sources feed it
the same way — the `/s/` client builds the map from raw rankings, the `/r/`
server builds it from a `groupBy` count query.

```ts
export interface ItemDistribution {
  distribution: { tierTitle: string; value: number; count: number; pct: number }[];
  sd: number;        // standard deviation across tier indices
  total: number;     // non-zero rankers for this item
}

export function computeItemDistribution(
  countsByValue: Map<number, number>,             // tier value -> ranker count (non-zero only)
  sortedTiers: { title: string; value: number }[] // S..F, descending value
): ItemDistribution;

export function divisiveness(sd: number): "low" | "mid" | "high";
```

- `distribution`: one entry per tier, `count` from `countsByValue`,
  `pct = round(count/total*100)`.
- `sd`: weighted std dev over the tier **indices** (matches the existing
  divisive-item math), so it's scale-stable across lists with different tier
  counts.
- `divisiveness`: threshold on `sd` (add `DIVISIVE_SD_MID`, `DIVISIVE_SD_HIGH`
  to `insightsConfig.ts`); used for the contention dot ("high", maybe "mid").
- Returns `total: 0` / empty distribution when `values` is empty; callers gate
  on `total >= MIN_ITEM_RANKERS_FOR_BADGE`.

## Data sources

- **`/s/`** (`ListDetail`): for each item, build a `value -> count` map from the
  already-loaded `item.rankings` (`value !== 0`) and call
  `computeItemDistribution`. Refactor the existing most-divisive-item
  computation to use the helper too (DRY).
- **`/r/`** (`computeListAggregates`): add a `groupBy(["itemId", "value"])`
  count query (same shape as `computePayoff`'s `itemValueDist`), build each
  item's `value -> count` map, call `computeItemDistribution`, and attach
  `distribution: ItemDistribution` to each `AggregatedItem`. No raw rankings
  leave the server.

Both paths yield the identical `ItemDistribution` shape per item.

## UI

- **Shared presentational component** `app/components/item/ItemDistribution.tsx`:
  given an `ItemDistribution` + the viewer's own tier value (or null), renders a
  compact horizontal histogram — a labelled row per tier (tier badge, bar
  width = pct, `pct%`), the consensus tier emphasised, and the viewer's own tier
  marked ("you"). Matches existing tier colors/classes.
- **Inline expand**: in the community tier rows of both `ListDetail` and the
  `/r/` `SharedListPage`, make an item toggle an expanded panel directly beneath
  its tier row showing `ItemDistribution`. Only one expanded at a time; gated on
  `total >= MIN_ITEM_RANKERS_FOR_BADGE` (otherwise a muted "not enough rankings
  yet"). `ItemCard` stays presentational; the parent owns the
  expanded-item state and the click handler.
- **Contention dot**: `ItemCard` gains an optional `contention?: "mid" | "high"`
  prop rendering a small corner dot (amber/red from the tier palette); parents
  pass it from `divisiveness(sd)`.
- **"Most divisive" sort**: a toggle in the community view header that reorders
  items within the unranked/tier display by `sd` desc (community view only; does
  not affect the viewer's own-ranking view).

## Privacy

- `/r/` ships only per-tier **counts**, never who ranked what — consistent with
  its existing "no individual rankings" guarantee.
- The own-pick marker uses the viewer's own ranking only.

## Testing

- Unit (`__tests__/itemDistribution.test.ts`): counts + pct sum, `sd` for a
  unanimous item = 0, a split item has higher `sd` than a clustered one,
  empty → `total 0`, `divisiveness` thresholds.
- Integration/staging: expand an item on `/s/` and `/r/` → correct histogram +
  own-pick marker; contention dots on divisive items; "most divisive" sort
  reorders; low-ranker items show the muted gate.

## Out of scope

- A full controversy heatmap/overlay across the whole grid (the per-card dot is
  the lightweight version).
- New share cards for arbitrary item distributions (the existing
  `divisive-item` share template stays as-is).
- Changing the consensus placement algorithm (averaged tier) — unchanged.
