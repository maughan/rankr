# Blind-compare challenge flow — design

## Goal

Turn a shared verdict link into a recruiting funnel. When someone opens a
challenge link, they rank the list **blind** (without seeing the sharer's or the
crowd's placements), then get a reveal showing how they align with the sharer
and the crowd. This converts passive link-viewers into rankers — the payoff of
the share links already built.

## Decisions (locked)

- **Dedicated route** for the challenge; `/r/` and `/v/` behaviour unchanged.
- Reveal compares the viewer against **the sharer** (headline) and **the crowd**
  (secondary).
- A viewer may **skip** ranking and jump to results, behind a small nudge.
- **Reuse the existing rank page** (`/r/[token]/s`) rather than extracting a
  dedicated ranker (lower risk; revisit if the seams feel bouncy).
- The canonical share link becomes **`/c/[ref]`**; `/v/[ref]` stays valid as an
  alias.

## Background (current behaviour)

- `/r/[token]` landing shows the crowd's aggregate tier placements immediately
  — this is the spoiler we avoid in the challenge.
- `/r/[token]/s` is the rank page: drag items from an unranked pool into tiers.
  It is inherently blind. On submit it POSTs `/api/r/[token]/rank` and redirects
  to `/r/[token]/submitted` (the crowd payoff).
- `ref` is the existing signed verdict ref (`lib/share/verdictRef.ts`),
  encoding `{ l: listId, i: identity, t: template }`. The challenge reuses it
  as-is — no payload change.

## Routing & entry — `/c/[ref]`

New segment `app/(pages)/c/[ref]/`.

- **Server `generateMetadata`**: verify `ref`; on success set OG/Twitter image
  to `/api/og/verdict?ref=<ref>` (reuse — unfurl is identical to today). Always
  `noindex` (share surface; canonical discovery stays `/s/`). Invalid/gone →
  generic title, `noindex`.
- The server page resolves `ref → { listId, sharerIdentity }`, loads the list
  (must be `visibility: public` and `is_shareable`) plus its `share_token`
  (the ref only carries `listId`, but the rank/skip links need the token).
- Renders a client component with: the list's `share_token`, the `ref`, the
  sharer's handle, and whether the current viewer has already ranked this list.

## Flow & states

`/c/[ref]` renders one of two states, decided by whether the viewer has a
ranking for this list (resolved from their cookie identity):

1. **Hook** (viewer has not ranked) — "@&lt;sharer&gt; ranked these. Think you
   agree? Rank blind first." Primary CTA → `/r/[token]/s?ref=<ref>`. A smaller
   "just show me the results" link (the friction'd skip) → `/r/[token]` (the
   normal spoiler view).
2. **Reveal** (viewer has ranked) — alignment vs sharer (headline) + vs crowd
   (secondary) + hottest take, with CTAs to share their own verdict and to
   browse/▶ other lists.

The rank step itself stays on the existing rank page. When `?ref=<ref>` is
present, the rank page (a) shows a slim "you're being challenged by @&lt;sharer&gt;"
banner, and (b) on submit redirects to `/c/[ref]` instead of `/submitted`. The
reveal then renders because the viewer now has a ranking.

End-to-end: open `/c/[ref]` → hook → "Rank blind" → `/r/[token]/s?ref` (blind
rank) → submit → `/c/[ref]` reveal. One substantive navigation (the rank step).

Crawlers never run the client JS, so they receive the 200 + verdict OG from
`generateMetadata` regardless of viewer state — unfurls are unaffected.

## Reveal data — `/api/c/[ref]/reveal`

New route. Verifies `ref` → `{ listId, sharerIdentity }`, resolves the viewer
from cookies (auth or anon session), then:

- **vs crowd + hottest take**: `computePayoff` (`lib/server/payoff.ts`) with the
  viewer's rankings — already built.
- **vs sharer**: load the sharer's rankings (by ref identity) and the viewer's
  rankings, then `scoreRankerPair` (already built + unit-tested) → `within/both`
  → `vsSharerPct`.

Returns `{ sharerHandle, vsSharerPct, vsCrowdPct, hottestTake, rankerCount }`.
Both identities resolve in either direction (anon sharer, anon viewer).

## Share link minting → `/c/`

`/api/r/[token]/share-ref` (and the PayoffPage "Copy share link" button) mint
`/c/[ref]` going forward. The OG card is unchanged (still `/api/og/verdict`), so
the unfurl looks the same; the difference is the click destination.
`/v/[ref]` remains valid for any links already in the wild.

## Edge cases

- Tampered/invalid `ref` → `/c` shows a friendly error; `/api/c/[ref]/reveal`
  returns 404.
- Sharer == viewer (shared to self) → vs-sharer line is hidden (no "100% with
  yourself").
- Sharer's anon session cleared / sharer has no rankings → reveal falls back to
  crowd-only (hide the vs-sharer line).
- List private / deleted / taken down → existing gone states.
- Viewer already ranked when landing on `/c/[ref]` → straight to reveal (no
  hook).
- List has `anonymous_rankings_enabled` false and viewer is anon → the "Rank
  blind" CTA routes to sign-in, mirroring the existing rank-page gating; the
  skip path still shows the crowd view.

## Analytics

Add events: challenge opened, challenge rank started, challenge submitted,
challenge skipped. Lets us measure the funnel (open → rank → submit) that
justifies the feature.

## Testing

- Unit: reveal aggregation shaping (vs-sharer + vs-crowd), and the sharer ==
  viewer / no-sharer-rankings fallbacks. `scoreRankerPair` and `computePayoff`
  are already covered.
- Staging: full click-through; skip path; anon-as-sharer and anon-as-viewer;
  already-ranked short-circuit; OG unfurl of a `/c/` link on
  X / Slack / iMessage / Facebook debugger.

## Out of scope (later)

- Extracting a dedicated in-route ranker (only if the reused rank page feels
  bouncy in testing).
- The template picker (verdict / hot-takes / crowd) on share links.
- A distinct hot-takes OG layout.
