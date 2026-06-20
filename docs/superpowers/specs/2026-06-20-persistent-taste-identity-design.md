# Persistent taste identity (Phase 1) — design

## Goal

Give people a reason to come back: a cross-stack taste identity. Your profile
shows your **taste twin** and **nemesis** aggregated across every list you've
ranked; another person's profile shows **how you two align** ("you agree 84%
across 5 lists"). Includes a **private profile** toggle so matching never
exposes anyone who hasn't opted in.

## Scope

Phase 1 = the cross-stack alignment engine + the two profile surfaces + a
private-profile toggle. Phase 2 (separate spec, later) = the payoff-reveal
integration and the "rank like you" discovery feed, both of which just consume
this engine.

## Decisions (locked)

- Compute strategy: **hybrid** — nightly precompute of each user's top
  twin/nemesis (stored on the user), pairwise "you two" computed on-demand.
- Show **twin + nemesis**.
- Twin/nemesis block is **owner-only** on your own profile; the mutual "you
  two" line shows to the viewer on another user's profile.
- Add a **private profile** toggle.
- Anonymous rankings are excluded — taste identity is for signed-in users.

## Background (reuse)

- `scoreRankerPair(aMap, bMap)` (`lib/server/payoff.ts`, unit-tested) already
  computes `{ within, agreed, both }` over two users' co-ranked items — this is
  exactly the pairwise alignment rule. `pct = round(within/both*100)`.
- `computePayoff` already pulls co-rankers via the `_ItemToList` join with a
  candidate cap — the precompute cron uses the same technique.
- `archetype` + `archetype_stats` are stored on `User` and refreshed by
  `app/api/cron/archetypes` — `taste_matches` follows the identical pattern.
- `getProfileData` (`lib/server/profileData.ts`) already takes a `viewerId` and
  does follow/block lookups — the on-demand pairwise slots in here.

## Data model

Prisma migration on `User`:

- `taste_matches Json?` — `{ twin: Match | null, nemesis: Match | null, computedAt: string } | null`, where
  `Match = { userId: number; username: string; displayName: string | null; pct: number; sharedItems: number; sharedLists: number }`.
- `profile_private Boolean @default(false)`.

No pair table (would be O(users²)).

## Thresholds (add to `lib/insightsConfig.ts`)

- `MIN_SHARED_ITEMS_FOR_MATCH = 10`
- `MIN_SHARED_LISTS_FOR_MATCH = 2`
- `MAX_MATCH_CANDIDATES = 500` (cap per user in the cron)

A pair only qualifies as twin/nemesis when it clears both shared-items and
shared-lists minimums.

## Core logic

`lib/server/tasteMatch.ts`:

- `type Candidate = { userId: number; username: string; displayName: string | null; within: number; both: number; sharedLists: number }`
- `pickTwinNemesis(candidates: Candidate[]): { twin: Match | null; nemesis: Match | null }` — **pure, unit-tested.** Filters to candidates with `both >= MIN_SHARED_ITEMS_FOR_MATCH && sharedLists >= MIN_SHARED_LISTS_FOR_MATCH`, then maps each survivor to a `Match` (`pct = round(within/both*100)`, `sharedItems = both`, identity carried from the candidate). Returns the max-pct survivor as twin and the min-pct as nemesis. If only one qualifier, nemesis is null (never the same person as both). Ties broken by higher `both` (more evidence).
- `buildPairwise(aMap, bMap, sharedLists): { pct: number; sharedItems: number; sharedLists: number } | null` — wraps `scoreRankerPair`; returns null when below thresholds. The on-demand caller (`getProfileData`) attaches the profile owner's identity to form the `you_two` payload (identity is already known — it's the owner).

## Precompute cron — `app/api/cron/taste-matches`

Nightly (add to the cron schedule next to `archetypes`). For each eligible
signed-in, **non-private** user with enough ranking history:

1. Load the user's `{ itemId -> value }` (value > 0).
2. One SQL via the `_ItemToList` join pulls candidate co-rankers' overlapping
   rankings (userId, itemId, value) — only from **non-private** users — capped
   at `MAX_MATCH_CANDIDATES` by shared-item count, mirroring `computePayoff`.
3. Aggregate per candidate into `Candidate` (within/both via the same rule;
   `sharedLists` = distinct lists with a shared item).
4. `pickTwinNemesis(...)` → write `taste_matches` JSON with `computedAt`.

Private users are excluded both as subjects (we don't compute/show their block
to others — it's owner-only anyway) and as candidates (never surfaced as
someone else's match).

## On-demand pairwise — inside `getProfileData`

When `viewerId` is present, differs from the owner, and the owner is **not
private** (a private owner returns the minimal payload anyway): load the two
users' overlapping rankings, call `buildPairwise`, and include
`you_two: { pct, sharedItems, sharedLists } | null` in the profile payload.
Cheap (two users). Null when below thresholds.

## Profile visibility (private toggle)

- `profile_private` true and `viewerId !== owner.id` → `getProfileData` returns
  a minimal payload: identity (username, display name, avatar) + a
  `is_private: true` flag, and **omits** lists, ranking stats, taste matches,
  and `you_two`. `/u/[username]` renders a "this profile is private" state and
  is `noindex`; the OG profile image falls back to a generic card.
- The owner always sees their own full profile.
- Note: private profile hides the **profile aggregation**, not a user's
  participation on public list pages (their rankings still feed crowd averages;
  that's existing behaviour and out of scope to change here).

## Surfaces

- **Own profile** (`viewerId === owner.id`): a taste-match card showing twin +
  nemesis from `taste_matches`, each linking to that user's profile, with
  "agree X% across N lists" / "clash X% across N lists". Hidden entirely when
  `taste_matches` is null (not enough history). Owner-only.
- **Another user's profile**: a one-line "you two agree X% across N lists" from
  `you_two`, shown to the viewer when present.

`lib/api/profileApi.ts` types gain `taste_matches` (owner payload) and
`you_two`; `ProfileClient.tsx` renders the card/line; a settings toggle
(`settings/profile`) flips `profile_private` via the existing profile-update
route.

## Testing

- Unit: `pickTwinNemesis` — threshold gating (below min items/lists excluded),
  max=twin / min=nemesis selection, single-qualifier → nemesis null, tie-break
  by `both`, empty input → both null.
- Unit: `buildPairwise` returns null below thresholds, correct pct above.
- Integration/staging: cron populates `taste_matches`; own-profile card; "you
  two" on another profile; private profile hides data + noindex; private users
  never appear as a match.

## Out of scope (Phase 2 / later)

- Payoff-reveal integration and the "rank like you" discovery feed.
- Follow-request/approval flow for private profiles (this is a hard
  public/private toggle, not a request system).
- Changing how private users' rankings contribute to public crowd averages.
