# Feed redesign (discovery-first) — design

## Goal

Make the feed the discovery core: rich, scannable list cards lead, with honest
social/taste signals, real tier previews, and no empty placeholders. Network
activity becomes a compact secondary strip; "people who rank like you" stays.

## Decisions (locked)

- **Discovery-first** hierarchy.
- **Full restructure** into sections.
- Every list card shows: a **tier preview strip**, **stats** (+ divisiveness),
  and a **twin-based hook** ("N of your taste twins ranked this") — NOT a
  fabricated predicted-% (we can't compute alignment for a list the viewer
  hasn't ranked).
- **Generated cover** when a list has no image.
- Network items gain a **real** social hook: "you align X%" (viewer vs the
  actor, whose ranking exists) + tiny tier dots + Compare.

## Sections (top → bottom)

1. **Made for you** — grid of rich cards: public lists ranked by the viewer's
   taste twins that the viewer hasn't ranked yet. Carries the twin hook.
2. **Trending** — grid of rich cards: public lists by recent ranking volume
   (fallback/discovery for users with no/few twins). No twin hook (or hook only
   when twins happen to overlap).
3. **From your network** — compact rows of follow activity (existing network
   events) with the align% hook + tier dots + Compare.
4. **People who rank like you** — existing discover-users chips (already taste-ranked).

Empty/cold-start: if "Made for you" is empty (no twins yet), it's omitted and
Trending leads — the feed is never empty.

## Rich list card — data shape

`RichListCard`:
```ts
{
  id: number; short_id: string; slug: string; title: string;
  img: string | null;
  item_count: number; ranking_count: number;
  coverColors: string[];          // top item colors, for the generated cover (when img is null)
  tierStrip: { tierTitle: string; value: number; itemCount: number }[]; // crowd placement counts per tier (value>0), S..F
  divisiveness: "calm" | "spicy" | "divisive";  // from aggregate item sd
  twinSignal: { count: number; sampleName: string | null } | null;      // "N taste twins ranked this"
}
```

## Backend

### Pure helpers — `lib/server/feedCards.ts` (unit-tested)
- `coverColorsFromItems(items: { color: string | null }[], n = 5): string[]` — first N non-null colors (fallback palette if none).
- `divisivenessLabel(avgSd: number): "calm" | "spicy" | "divisive"` — thresholds (reuse/extend `DIVISIVE_SD_MID`/`DIVISIVE_SD_HIGH` from `insightsConfig`).
- `tierStripFromPlacements(items, sortedTiers)` — crowd consensus tier per item (round of avg ranking value, reusing the same rule as `computeListAggregates`), counted per tier (value>0). Returns `{ tierTitle, value, itemCount }[]`. (This is list-level; the existing `computeItemDistribution` is per-item — share the averaging logic.)

### Card builder — `buildRichListCard(list, rankings)` 
Server fn that, given a list's items + their rankings, produces a `RichListCard`
(minus `twinSignal`, which the caller injects). Reuses the aggregate averaging
already in `lib/server/aggregation.ts`; factor the shared per-item-average into a
helper so aggregation and this don't drift.

### Endpoint — `GET /api/feed/discover-lists`
Auth required. Returns `{ madeForYou: RichListCard[], trending: RichListCard[] }`.
- **madeForYou:** read `viewer.taste_matches.top` (the precomputed twins) → their user ids → distinct public lists those users have ranked (value>0), excluding lists the viewer already ranked, excluding blocked authors, cap ~8. For each, `buildRichListCard` + `twinSignal` (count of twins who ranked it + one sample name). Order by twin count desc.
- **trending:** public, non-deleted, non-takendown lists ordered by ranking count in the last N days (or all-time `ranking_count` as a simple v1), cap ~8, excluding ones already in madeForYou. `buildRichListCard`, `twinSignal` null. Use `(prisma.list as any)` where the stale client lacks fields.
- Cacheable per-viewer is hard (taste-specific) → no shared cache; keep queries bounded (caps + indexed lookups).

### Network social hook (in `/api/feed`)
For the network items on the page (bounded by page size), enrich each with
`align`: the viewer-vs-actor alignment on that list via `scoreRankerPair`
(load the two users' rankings for that list). Add `align: { pct } | null` to
`NetworkFeedItem`. Skip when the viewer hasn't ranked that list (null → no hook).

## Frontend

- `app/components/feed/GeneratedCover.tsx` — given `coverColors` + title, renders
  a flat diagonal/blocked color cover with the title; used by `RichListCard` when
  `img` is null. (No gradients per design system elsewhere, but covers are a
  deliberate decorative surface — keep them flat color blocks.)
- `app/components/feed/RichListCard.tsx` — cover (img or GeneratedCover), title,
  stats line (`{item_count} items · {ranking_count} ranked · {divisiveness}`),
  the tier strip (bar per tier, width ∝ `itemCount`, tier color), the twin hook
  pill when `twinSignal`, and a "Rank it →" link to `/s/<slug>-<short_id>/s`.
- `lib/api/feedApi.ts` — add `RichListCard`, the `discover-lists` fetcher, and
  `align` on `NetworkFeedItem`.
- `app/(pages)/feed/page.tsx` — restructure into the four sections. "Made for
  you" + "Trending" render `RichListCard` grids (2-up desktop, 1-up mobile).
  Network strip = the existing network items, compacted, with the align% hook +
  tier dots + Compare. Keep the infinite-scroll/poll for the network layer;
  the discovery sections load once (page 1).

## Privacy / safety

- Exclude blocked authors from all sections; private profiles already excluded
  from `taste_matches.top`.
- `twinSignal` names a public twin (the twin relationship is already surfaced to
  the viewer on their profile); sample only a non-private twin.
- The network align% uses only the viewer's own ranking vs a public actor's.

## Testing

- Unit (`__tests__/feedCards.test.ts`): `coverColorsFromItems` (filters nulls,
  caps, fallback), `divisivenessLabel` (thresholds), `tierStripFromPlacements`
  (counts per tier, excludes value 0, empty → all zero).
- Integration/staging: made-for-you shows twin-ranked lists with the hook;
  trending fills when no twins; generated covers replace placeholders; network
  align% appears only where the viewer has ranked; cold-start (no twins) never
  empty.

## Out of scope

- Predicted taste-% for unranked lists (not computable; replaced by twin hook).
- New cover *images* / uploads (generated covers only).
- Realtime discovery refresh (loads on page 1; fine).
- Personalized ranking model beyond "twins ranked it" + recency.
