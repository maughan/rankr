# Taste Discovery (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the Phase 1 taste engine to drive a "rank like you" discovery feed and a persistent taste-twin surface on the payoff reveal.

**Architecture:** Extend `computeTasteMatches` to also precompute a top-N match list into the existing `taste_matches` JSON (nightly cron unchanged). `/api/feed/discover` reads that top-N (read-time filtering of followed/blocked; cold-start fallback to follower-count). `computePayoff` reads the viewer's stored twin into `PayoffData.tasteTwin`; the payoff UI shows an inline twin card + a discover CTA.

**Tech Stack:** Next.js 16, React 19, Prisma/Postgres, RTK Query, vitest.

---

## File Structure

- Modify `lib/insightsConfig.ts` — add `MAX_DISCOVER_MATCHES`.
- Modify `lib/server/tasteMatch.ts` — `TasteMatches.top`, pure `topMatches`, wire into `computeTasteMatches`.
- Modify `__tests__/tasteMatch.test.ts` — tests for `topMatches`.
- Modify `app/api/feed/discover/route.ts` — taste-ranked discovery + fallback.
- Modify `lib/api/feedApi.ts` — extend `DiscoverUser`.
- Modify the feed page discover section — render `pct`.
- Modify `lib/server/payoff.ts` — `PayoffData.tasteTwin` + load it in `computePayoff`.
- Modify `lib/api/listsApi.ts` — mirror `tasteTwin` on the client `PayoffData` type (if it has its own copy).
- Modify `app/components/payoff/index.tsx` — inline twin card + discover CTA.

---

## Task 1: top-N matches in the engine

**Files:**
- Modify: `lib/insightsConfig.ts`
- Modify: `lib/server/tasteMatch.ts`
- Test: `__tests__/tasteMatch.test.ts`

- [ ] **Step 1: Add the constant** to `lib/insightsConfig.ts` (next to `MAX_MATCH_CANDIDATES`):

```ts
export const MAX_DISCOVER_MATCHES = 10;
```

- [ ] **Step 2: Write failing tests** — append to `__tests__/tasteMatch.test.ts`:

```ts
import { topMatches } from "@/lib/server/tasteMatch";

describe("topMatches", () => {
  it("returns qualifiers sorted by pct desc, capped to the limit", () => {
    const cands = [
      cand({ userId: 1, username: "a", within: 10, both: 20, sharedLists: 2 }), // 50
      cand({ userId: 2, username: "b", within: 18, both: 20, sharedLists: 2 }), // 90
      cand({ userId: 3, username: "c", within: 14, both: 20, sharedLists: 2 }), // 70
    ];
    const r = topMatches(cands, 2);
    expect(r.map((m) => m.username)).toEqual(["b", "c"]);
    expect(r[0].pct).toBe(90);
  });

  it("excludes candidates below the thresholds", () => {
    const cands = [
      cand({ userId: 1, username: "fewitems", within: 4, both: 5, sharedLists: 3 }),
      cand({ userId: 2, username: "fewlists", within: 18, both: 20, sharedLists: 1 }),
    ];
    expect(topMatches(cands, 10)).toEqual([]);
  });

  it("breaks pct ties by more shared items", () => {
    const r = topMatches([
      cand({ userId: 1, username: "thin", within: 9, both: 10, sharedLists: 2 }),  // 90, both 10
      cand({ userId: 2, username: "thick", within: 27, both: 30, sharedLists: 3 }), // 90, both 30
    ], 10);
    expect(r[0].username).toBe("thick");
  });

  it("empty input → []", () => {
    expect(topMatches([], 10)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run, confirm fail**

Run: `npx vitest run __tests__/tasteMatch.test.ts`
Expected: FAIL — `topMatches` is not exported. (If vitest errors on the rolldown binding, `npm install --no-save @rolldown/binding-linux-arm64-gnu` then retry.)

- [ ] **Step 4: Implement.** In `lib/server/tasteMatch.ts`:

Add `MAX_DISCOVER_MATCHES` to the `@/lib/insightsConfig` import. Add `top` to the interface:
```ts
export interface TasteMatches {
  twin: TasteMatch | null;
  nemesis: TasteMatch | null;
  top: TasteMatch[];
  computedAt: string;
}
```
Add the pure helper (after `pickTwinNemesis`):
```ts
export function topMatches(
  candidates: TasteMatchCandidate[],
  limit: number
): TasteMatch[] {
  return candidates
    .filter(qualifies)
    .map(toMatch)
    .sort((a, b) => b.pct - a.pct || b.sharedItems - a.sharedItems)
    .slice(0, limit);
}
```
In `computeTasteMatches`, replace the final block:
```ts
  const { twin, nemesis } = pickTwinNemesis(capped);
  if (!twin && !nemesis) return null;
  return { twin, nemesis, computedAt: new Date().toISOString() };
```
with:
```ts
  const { twin, nemesis } = pickTwinNemesis(capped);
  const top = topMatches(capped, MAX_DISCOVER_MATCHES);
  if (!twin && !nemesis && top.length === 0) return null;
  return { twin, nemesis, top, computedAt: new Date().toISOString() };
```

- [ ] **Step 5: Run, confirm pass**

Run: `npx vitest run __tests__/tasteMatch.test.ts`
Expected: all pass (prior 8 + 4 new).

- [ ] **Step 6: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint lib/server/tasteMatch.ts __tests__/tasteMatch.test.ts lib/insightsConfig.ts`
```bash
git add lib/server/tasteMatch.ts __tests__/tasteMatch.test.ts lib/insightsConfig.ts
git commit -m "feat: precompute top-N taste matches"
```

---

## Task 2: "rank like you" discovery

**Files:**
- Modify: `app/api/feed/discover/route.ts`
- Modify: `lib/api/feedApi.ts`
- Modify: the feed page discover section (find it: `grep -rn "fetchDiscoverUsers\|DiscoverUser" "app/(pages)/feed/page.tsx"`)

Read `app/api/feed/discover/route.ts` and `lib/api/feedApi.ts` first.

- [ ] **Step 1: Extend the type** in `lib/api/feedApi.ts` — add to `DiscoverUser`:
```ts
  pct: number | null;
  sharedLists: number | null;
```

- [ ] **Step 2: Taste-rank the discover route.** In `app/api/feed/discover/route.ts`, after computing `excludeIds` (self + following + blocked), insert taste-ranked logic before the existing follower-count query:

```ts
  const viewerRow = (await (prisma.user as any).findUnique({
    where: { id: viewer.id },
    select: { taste_matches: true },
  })) as { taste_matches: { top?: { userId: number; username: string; displayName: string | null; pct: number; sharedLists: number }[] } | null } | null;

  const top = viewerRow?.taste_matches?.top ?? [];
  const ranked = top.filter((m) => !excludeIds.has(m.userId)).slice(0, 5);

  if (ranked.length > 0) {
    const rows = await prisma.user.findMany({
      where: { id: { in: ranked.map((m) => m.userId) } },
      select: {
        id: true,
        username: true,
        display_name: true,
        lists: { where: { visibility: "public" }, orderBy: { updatedAt: "desc" }, take: 1, select: { title: true } },
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const result: DiscoverUser[] = ranked
      .map((m) => {
        const r = byId.get(m.userId);
        if (!r) return null;
        return {
          username: r.username,
          display_name: r.display_name,
          latest_list_title: r.lists[0]?.title ?? null,
          pct: m.pct,
          sharedLists: m.sharedLists,
        };
      })
      .filter((x): x is DiscoverUser => x !== null);
    if (result.length > 0) return NextResponse.json(result);
  }
```

Then leave the existing follower-count query as the fallback, but add `pct: null, sharedLists: null` to each mapped `DiscoverUser` it returns. Import `DiscoverUser` from `@/lib/api/feedApi` if not already, or keep the local interface in sync (whichever the file currently does — match it).

- [ ] **Step 3: Render pct in the feed.** In the feed page's discover section, where each `DiscoverUser` renders, add — when `user.pct != null` — a small line "ranks like you {user.pct}%" (match the section's existing styling). Leave the non-taste presentation unchanged when `pct == null`.

- [ ] **Step 4: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint app/api/feed/discover/route.ts lib/api/feedApi.ts "app/(pages)/feed/page.tsx"`
Expected: tsc clean; no NEW eslint errors (report pre-existing).
```bash
git add app/api/feed/discover/route.ts lib/api/feedApi.ts "app/(pages)/feed/page.tsx"
git commit -m "feat: rank-like-you discovery feed"
```

---

## Task 3: Payoff taste-twin card + discover CTA

**Files:**
- Modify: `lib/server/payoff.ts`
- Modify: `lib/api/listsApi.ts` (if it declares its own `PayoffData`)
- Modify: `app/components/payoff/index.tsx`

Read `lib/server/payoff.ts` (the `PayoffData` interface + the end of `computePayoff`) and check whether `lib/api/listsApi.ts` re-declares `PayoffData` (the client type). Read `app/components/payoff/index.tsx` around the existing `closestMatch` rendering.

- [ ] **Step 1: Extend `PayoffData`** in `lib/server/payoff.ts`:
```ts
  tasteTwin: {
    userId: number;
    username: string;
    displayName: string | null;
    pct: number;
    sharedItems: number;
    sharedLists: number;
  } | null;
```
(If `lib/api/listsApi.ts` has its own `PayoffData` copy used by the client, add the identical field there.)

- [ ] **Step 2: Populate it in `computePayoff`.** Near the top (after `currentUserId` is known), load the stored twin:
```ts
  let tasteTwin: PayoffData["tasteTwin"] = null;
  if (currentUserId !== null) {
    const u = (await (prisma.user as any).findUnique({
      where: { id: currentUserId },
      select: { taste_matches: true },
    })) as { taste_matches: { twin?: PayoffData["tasteTwin"] } | null } | null;
    tasteTwin = u?.taste_matches?.twin ?? null;
  }
```
Add `tasteTwin,` to the returned object.

- [ ] **Step 3: Render in the payoff UI** (`app/components/payoff/index.tsx`):
  - When `data.tasteTwin`: an inline card "You rank most like @{username} — {pct}% across {sharedLists} lists", linking to `/u/{username}`. Place it near the existing `closestMatch` block; label it clearly as the overall taste twin (distinct from the per-list closest match). Match existing classes.
  - A "See who ranks like you" link/button → `/feed`, shown to signed-in users (`!isAnon`); omit for anon.

- [ ] **Step 4: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint lib/server/payoff.ts lib/api/listsApi.ts app/components/payoff/index.tsx`
Expected: tsc clean; no NEW eslint errors.
```bash
git add lib/server/payoff.ts lib/api/listsApi.ts app/components/payoff/index.tsx
git commit -m "feat: payoff taste-twin card + discover CTA"
```

---

## Task 4: Verification + final review

- [ ] **Step 1: Suite + types + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
npx eslint lib/server/tasteMatch.ts __tests__/tasteMatch.test.ts app/api/feed/discover/route.ts lib/api/feedApi.ts lib/server/payoff.ts app/components/payoff/index.tsx
```
Expected: tsc clean; all tests pass (prior + 4 new `topMatches`); no new lint errors.

- [ ] **Step 2: Final review subagent** over the changed files — focus: discovery never surfaces followed/blocked/private users; cold-start fallback returns results; `tasteTwin`/discover CTA hidden for anon; the precompute `top` ordering matches the discover read.

- [ ] **Step 3: Manual / staging checklist**
- Viewer with `taste_matches.top` → discover shows taste-ranked users with "ranks like you %"; follow one → they drop off discover.
- Cold-start viewer (no matches) → discover falls back to follower-count.
- Payoff shows the taste-twin card (when a twin exists) + "see who ranks like you" CTA; anon payoff shows neither.
- Re-run the nightly cron and confirm `top` populates.

---

## Notes

- No DB migration this phase — `top` lives inside the existing `taste_matches` JSON column.
- Only new pure logic is `topMatches` (Task 1, tested); everything else reads precomputed data or reuses existing queries.
- Keep `(prisma.user as any)` for `taste_matches` access (generated client doesn't type the column in-sandbox; matches the established convention).
