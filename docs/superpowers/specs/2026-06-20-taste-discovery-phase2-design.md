# Taste discovery (Phase 2) — design

## Goal

Put the cross-stack taste engine (Phase 1) to work driving discovery and
re-engagement: a "rank like you" discovery feed and a persistent taste-twin
surface on the payoff reveal. Both consume the existing engine — no new scoring
math.

## Decisions (locked)

- Build both pieces together.
- Discovery ranking: **hybrid** — read a nightly-precomputed top-N match list.
- Payoff: show **both** an inline cross-stack twin card and a "see who ranks
  like you" CTA to the feed.

## Background (reuse)

- `lib/server/tasteMatch.ts`: `computeTasteMatches(userId)` already scores all
  candidate co-rankers (excluding anon + private users) and returns
  `{ twin, nemesis, computedAt }`. `pickTwinNemesis` filters/sorts qualifiers.
- The nightly cron `app/api/cron/taste-matches` writes `User.taste_matches` JSON.
- `app/api/feed/discover/route.ts` already returns `DiscoverUser[]` (top users by
  `follower_count`, excluding self/following/blocked) and is rendered by the feed
  page via `fetchDiscoverUsers` / `DiscoverUser` (`lib/api/feedApi.ts`).
- `computePayoff` (`lib/server/payoff.ts`) returns `PayoffData` and already
  surfaces a per-list `closestMatch`; the payoff UI is `app/components/payoff/index.tsx`.

## Engine extension — precomputed top-N

In `lib/server/tasteMatch.ts`:

- Add `top: TasteMatch[]` to the `TasteMatches` interface:
  `{ twin: TasteMatch | null; nemesis: TasteMatch | null; top: TasteMatch[]; computedAt: string }`.
- Add a pure helper `topMatches(candidates: TasteMatchCandidate[], limit: number): TasteMatch[]`
  — filters by the same `qualifies` gate, maps to `TasteMatch`, sorts by pct
  desc (tie-break by `sharedItems` desc), slices to `limit`. **Unit-tested.**
- `computeTasteMatches` calls `topMatches(capped, MAX_DISCOVER_MATCHES)` and
  includes it in the returned object. `pickTwinNemesis` is unchanged (twin =
  `top[0]` conceptually, but keep the existing function as the source of truth
  for twin/nemesis to avoid behaviour drift).
- Add `MAX_DISCOVER_MATCHES = 10` to `lib/insightsConfig.ts`.

The cron already writes the whole `taste_matches` object, so it picks up `top`
with no cron change.

## Discovery feed — "rank like you"

Modify `app/api/feed/discover/route.ts`:

1. Load the viewer's `taste_matches` (via `(prisma.user as any)` — the column is
   accessed untyped elsewhere too).
2. If `taste_matches.top` is non-empty: take those user ids, exclude any the
   viewer now follows or has blocked (read-time filter — the same follow/block
   queries the route already runs), hydrate each surviving match with its latest
   public list title, and return them ranked by pct as
   `DiscoverUser & { pct: number; sharedLists: number }`. Private users are
   already absent (excluded at precompute).
3. If the viewer has no `taste_matches.top` (cold start) or all were filtered
   out: fall back to the existing follower-count query (current behaviour),
   returning entries with `pct: null`.

Extend `DiscoverUser` (`lib/api/feedApi.ts`) with optional
`pct: number | null` and `sharedLists: number | null`. The feed page's discover
section renders "ranks like you {pct}%" when `pct != null`, otherwise the
current presentation.

## Payoff integration

- Add `tasteTwin: TasteMatch | null` to `PayoffData`. In `computePayoff`, when
  `currentUserId` is set, read that user's `taste_matches.twin` (one
  `(prisma.user as any).findUnique` selecting `taste_matches`); anon viewers and
  users without a computed match get `null`.
- `app/components/payoff/index.tsx`:
  - Inline card when `data.tasteTwin`: "You rank most like @{username} — {pct}%
    across {sharedLists} lists", linking to `/u/{username}`. Distinct from the
    existing per-list `closestMatch` block (label it as your overall taste twin).
  - A "See who ranks like you" CTA (button/link) → `/feed` (the discover
    section). Always shown to signed-in users; for anon, omit (no persistent
    identity / discover requires auth).

## Privacy

- Discovery never surfaces private users (excluded at precompute) and never
  surfaces blocked/blocking or already-followed users (read-time filter).
- `tasteTwin` on the payoff points only to a non-private user (precompute
  excludes private candidates).
- Anonymous viewers get no `tasteTwin` and no discover CTA.

## Testing

- Unit: `topMatches` — threshold gating, pct-desc ordering, tie-break by
  shared items, `limit` slicing, empty input → `[]`.
- Integration/staging: discover returns taste-ranked users for a viewer with
  matches and falls back for a cold-start viewer; follow/block users are
  excluded; payoff shows the twin card + CTA; anon payoff shows neither.

## Out of scope

- Changing the scoring rule or the nightly schedule.
- A standalone "people like you" page (the existing feed discover section is the
  surface; a dedicated page can come later).
- Real-time recompute on rank (twin/top refresh nightly; acceptable per Phase 1).
