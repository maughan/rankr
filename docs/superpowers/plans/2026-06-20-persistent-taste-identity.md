# Persistent Taste Identity (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cross-stack taste identity — your profile shows your taste twin + nemesis aggregated across all your lists; another user's profile shows "you two agree X% across N lists"; plus a private-profile toggle so matching never exposes anyone.

**Architecture:** Hybrid compute. A nightly cron precomputes each user's twin/nemesis into a `taste_matches` JSON column (mirrors the existing `archetype_stats` + `app/api/cron/archetypes` pattern). The "you two" pair is computed on-demand in `getProfileData`. Pair math reuses the tested `scoreRankerPair`; the only new pure logic is `pickTwinNemesis`. A `profile_private` boolean gates profile visibility and excludes users from matching.

**Tech Stack:** Next.js 16, React 19, Prisma/Postgres, RTK Query, vitest.

---

## File Structure

- Modify `prisma/schema.prisma` — add `taste_matches Json?` and `profile_private Boolean @default(false)` to `User`.
- Modify `lib/insightsConfig.ts` — add match thresholds.
- Create `lib/server/tasteMatch.ts` — types + pure `pickTwinNemesis` + `buildPairwise` + the DB aggregator `computeTasteMatches(userId)`.
- Create `__tests__/tasteMatch.test.ts` — unit tests for the pure functions.
- Create `app/api/cron/taste-matches/route.ts` — nightly precompute (mirrors archetypes cron).
- Modify `vercel.json` — schedule the cron.
- Modify `lib/server/profileData.ts` — read `taste_matches` (owner only), compute `you_two` (on-demand), enforce `profile_private`.
- Modify `lib/api/profileApi.ts` — extend `ProfileUser`/`ProfileResponse` types.
- Modify `app/(pages)/u/[username]/ProfileClient.tsx` — render taste card / "you two" line / private state.
- Modify `app/(pages)/u/[username]/page.tsx` — `noindex` when private.
- Modify settings profile page + `/api/user/update` — `profile_private` toggle.

---

## Task 1: Schema fields + thresholds

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/insightsConfig.ts`

- [ ] **Step 1: Add User columns** — in `model User` (after `archetype_computed_at`):

```prisma
  taste_matches            Json?
  profile_private          Boolean               @default(false)
```

- [ ] **Step 2: Regenerate the Prisma client** (no DB needed):

Run: `cd /sessions/quirky-wizardly-euler/mnt/rankr && npx prisma generate`
Expected: "Generated Prisma Client". (The actual DB migration — `npx prisma migrate dev --name taste_identity` — must be run by the human against their database; note this in the final report. tsc relies only on the generated client.)

- [ ] **Step 3: Add thresholds** to `lib/insightsConfig.ts` (near the other `MIN_*` constants):

```ts
export const MIN_SHARED_ITEMS_FOR_MATCH = 10;
export const MIN_SHARED_LISTS_FOR_MATCH = 2;
export const MAX_MATCH_CANDIDATES = 500;
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma lib/insightsConfig.ts
git commit -m "feat: taste-identity schema fields + thresholds"
```

---

## Task 2: Pure helpers `pickTwinNemesis` + `buildPairwise` (TDD)

**Files:**
- Create: `lib/server/tasteMatch.ts`
- Test: `__tests__/tasteMatch.test.ts`

- [ ] **Step 1: Write the failing test** at `__tests__/tasteMatch.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pickTwinNemesis, buildPairwise, TasteMatchCandidate } from "@/lib/server/tasteMatch";

const cand = (over: Partial<TasteMatchCandidate>): TasteMatchCandidate => ({
  userId: 1, username: "u", displayName: null, within: 0, both: 0, sharedLists: 0, ...over,
});

describe("pickTwinNemesis", () => {
  it("picks max-pct twin and min-pct nemesis among qualifiers", () => {
    const cands = [
      cand({ userId: 1, username: "high", within: 18, both: 20, sharedLists: 3 }), // 90%
      cand({ userId: 2, username: "low", within: 5, both: 20, sharedLists: 3 }),   // 25%
      cand({ userId: 3, username: "mid", within: 12, both: 20, sharedLists: 3 }),  // 60%
    ];
    const r = pickTwinNemesis(cands);
    expect(r.twin?.username).toBe("high");
    expect(r.twin?.pct).toBe(90);
    expect(r.twin?.sharedItems).toBe(20);
    expect(r.nemesis?.username).toBe("low");
    expect(r.nemesis?.pct).toBe(25);
  });

  it("excludes candidates below the shared-items / shared-lists minimums", () => {
    const cands = [
      cand({ userId: 1, username: "fewitems", within: 4, both: 5, sharedLists: 3 }),  // both<10
      cand({ userId: 2, username: "fewlists", within: 18, both: 20, sharedLists: 1 }), // lists<2
    ];
    expect(pickTwinNemesis(cands)).toEqual({ twin: null, nemesis: null });
  });

  it("returns nemesis null when only one qualifier (never same person as both)", () => {
    const r = pickTwinNemesis([cand({ userId: 1, username: "solo", within: 15, both: 20, sharedLists: 2 })]);
    expect(r.twin?.username).toBe("solo");
    expect(r.nemesis).toBeNull();
  });

  it("breaks pct ties by higher both (more evidence)", () => {
    const r = pickTwinNemesis([
      cand({ userId: 1, username: "thin", within: 9, both: 10, sharedLists: 2 }),   // 90%, both 10
      cand({ userId: 2, username: "thick", within: 27, both: 30, sharedLists: 3 }), // 90%, both 30
    ]);
    expect(r.twin?.username).toBe("thick");
  });

  it("empty input → both null", () => {
    expect(pickTwinNemesis([])).toEqual({ twin: null, nemesis: null });
  });
});

describe("buildPairwise", () => {
  it("returns null below the shared-items minimum", () => {
    const a = new Map([[1, 6], [2, 5]]);
    const b = new Map([[1, 6], [2, 5]]);
    expect(buildPairwise(a, b, 2)).toBeNull();
  });

  it("returns pct/sharedItems/sharedLists above thresholds", () => {
    const a = new Map<number, number>();
    const b = new Map<number, number>();
    for (let i = 1; i <= 12; i++) { a.set(i, 5); b.set(i, i <= 9 ? 5 : 1); } // 9/12 within
    const r = buildPairwise(a, b, 2);
    expect(r).not.toBeNull();
    expect(r!.sharedItems).toBe(12);
    expect(r!.pct).toBe(75);
    expect(r!.sharedLists).toBe(2);
  });

  it("returns null below the shared-lists minimum", () => {
    const a = new Map<number, number>(); const b = new Map<number, number>();
    for (let i = 1; i <= 12; i++) { a.set(i, 5); b.set(i, 5); }
    expect(buildPairwise(a, b, 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, confirm it fails**

Run: `npx vitest run __tests__/tasteMatch.test.ts`
Expected: FAIL (module missing). If vitest errors on `@rolldown/binding-linux-arm64-gnu`, run `npm install --no-save @rolldown/binding-linux-arm64-gnu` then retry.

- [ ] **Step 3: Implement the pure parts** in `lib/server/tasteMatch.ts`:

```ts
import { scoreRankerPair } from "@/lib/server/payoff";
import {
  MIN_SHARED_ITEMS_FOR_MATCH,
  MIN_SHARED_LISTS_FOR_MATCH,
} from "@/lib/insightsConfig";

export interface TasteMatch {
  userId: number;
  username: string;
  displayName: string | null;
  pct: number;
  sharedItems: number;
  sharedLists: number;
}

export interface TasteMatchCandidate {
  userId: number;
  username: string;
  displayName: string | null;
  within: number;
  both: number;
  sharedLists: number;
}

export interface TasteMatches {
  twin: TasteMatch | null;
  nemesis: TasteMatch | null;
  computedAt: string;
}

function qualifies(c: TasteMatchCandidate): boolean {
  return (
    c.both >= MIN_SHARED_ITEMS_FOR_MATCH &&
    c.sharedLists >= MIN_SHARED_LISTS_FOR_MATCH
  );
}

function toMatch(c: TasteMatchCandidate): TasteMatch {
  return {
    userId: c.userId,
    username: c.username,
    displayName: c.displayName,
    pct: Math.round((c.within / c.both) * 100),
    sharedItems: c.both,
    sharedLists: c.sharedLists,
  };
}

export function pickTwinNemesis(candidates: TasteMatchCandidate[]): {
  twin: TasteMatch | null;
  nemesis: TasteMatch | null;
} {
  const matches = candidates.filter(qualifies).map(toMatch);
  if (matches.length === 0) return { twin: null, nemesis: null };

  // Twin = highest pct; tie-break by more shared items.
  const twin = matches.reduce((best, m) =>
    m.pct > best.pct || (m.pct === best.pct && m.sharedItems > best.sharedItems) ? m : best
  );
  if (matches.length === 1) return { twin, nemesis: null };

  // Nemesis = lowest pct among the rest; tie-break by more shared items.
  const rest = matches.filter((m) => m.userId !== twin.userId);
  const nemesis = rest.reduce((worst, m) =>
    m.pct < worst.pct || (m.pct === worst.pct && m.sharedItems > worst.sharedItems) ? m : worst
  );
  return { twin, nemesis };
}

export function buildPairwise(
  aValues: Map<number, number>,
  bValues: Map<number, number>,
  sharedLists: number
): { pct: number; sharedItems: number; sharedLists: number } | null {
  const { within, both } = scoreRankerPair(aValues, bValues);
  if (both < MIN_SHARED_ITEMS_FOR_MATCH || sharedLists < MIN_SHARED_LISTS_FOR_MATCH) {
    return null;
  }
  return { pct: Math.round((within / both) * 100), sharedItems: both, sharedLists };
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `npx vitest run __tests__/tasteMatch.test.ts`
Expected: all pass.

- [ ] **Step 5: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint lib/server/tasteMatch.ts __tests__/tasteMatch.test.ts`
```bash
git add lib/server/tasteMatch.ts __tests__/tasteMatch.test.ts
git commit -m "feat: pickTwinNemesis + buildPairwise (TDD)"
```

---

## Task 3: DB aggregator `computeTasteMatches(userId)`

**Files:**
- Modify: `lib/server/tasteMatch.ts`

Read `lib/server/payoff.ts` first for the `_ItemToList` raw-SQL co-ranker pattern and the `prisma as any` convention.

- [ ] **Step 1: Append the aggregator** to `lib/server/tasteMatch.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { MAX_MATCH_CANDIDATES } from "@/lib/insightsConfig";

// Returns null when the user has no qualifying twin/nemesis.
export async function computeTasteMatches(
  userId: number
): Promise<TasteMatches | null> {
  // The subject's own rankings (value > 0).
  const own = (await prisma.ranking.findMany({
    where: { userId, value: { gt: 0 } },
    select: { itemId: true, value: true },
  })) as { itemId: number; value: number }[];
  if (own.length < MIN_SHARED_ITEMS_FOR_MATCH) return null;

  const ownMap = new Map(own.map((r) => [r.itemId, r.value]));
  const itemIds = [...ownMap.keys()];

  // Candidate co-rankers: other NON-PRIVATE signed-in users who ranked any of
  // the same items. One query; aggregation happens in JS.
  const rows = (await prisma.$queryRaw<
    { userId: number; username: string; display_name: string | null; itemId: number; value: number; listId: number }[]
  >(Prisma.sql`
    SELECT r."userId", u.username, u.display_name, r."itemId", r.value, itl."B" AS "listId"
    FROM "Ranking" r
    JOIN "User" u ON u.id = r."userId"
    JOIN "_ItemToList" itl ON itl."A" = r."itemId"
    WHERE r."itemId" IN (${Prisma.join(itemIds)})
      AND r."userId" IS NOT NULL
      AND r."userId" <> ${userId}
      AND r.value > 0
      AND u.profile_private = false
  `)) as { userId: number; username: string; display_name: string | null; itemId: number; value: number; listId: number }[];

  // Aggregate per candidate.
  type Agg = { username: string; displayName: string | null; values: Map<number, number>; lists: Set<number> };
  const byUser = new Map<number, Agg>();
  for (const row of rows) {
    let a = byUser.get(row.userId);
    if (!a) {
      a = { username: row.username, displayName: row.display_name, values: new Map(), lists: new Set() };
      byUser.set(row.userId, a);
    }
    a.values.set(row.itemId, row.value);
    a.lists.add(row.listId);
  }

  const candidates: TasteMatchCandidate[] = [];
  for (const [candId, a] of byUser) {
    const { within, both } = scoreRankerPair(ownMap, a.values);
    if (both === 0) continue;
    candidates.push({
      userId: candId,
      username: a.username,
      displayName: a.displayName,
      within,
      both,
      sharedLists: a.lists.size,
    });
  }

  // Cap by evidence to bound work in pickTwinNemesis (already cheap, but keep the contract).
  candidates.sort((x, y) => y.both - x.both);
  const capped = candidates.slice(0, MAX_MATCH_CANDIDATES);

  const { twin, nemesis } = pickTwinNemesis(capped);
  if (!twin && !nemesis) return null;
  return { twin, nemesis, computedAt: new Date().toISOString() };
}
```

- [ ] **Step 2: tsc + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint lib/server/tasteMatch.ts`
Expected: clean. (If `Prisma.join`/`$queryRaw` generic types complain, mirror exactly how `lib/server/payoff.ts` writes its raw query.)

- [ ] **Step 3: Commit**

```bash
git add lib/server/tasteMatch.ts
git commit -m "feat: computeTasteMatches DB aggregator"
```

---

## Task 4: Nightly cron `app/api/cron/taste-matches`

**Files:**
- Create: `app/api/cron/taste-matches/route.ts`
- Modify: `vercel.json`

Mirror `app/api/cron/archetypes/route.ts` exactly (CRON_SECRET auth, batch, per-user update).

- [ ] **Step 1: Write the route**

```ts
import { prisma } from "@/lib/prisma";
import { computeTasteMatches } from "@/lib/server/tasteMatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 200;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Only non-private users with ranking history are matchable subjects.
  const candidates = (await (prisma.user as any).findMany({
    where: { profile_private: false, rankings: { some: { value: { gt: 0 } } } },
    select: { id: true },
    take: BATCH_SIZE,
    orderBy: { id: "asc" },
  })) as { id: number }[];

  let computed = 0;
  let cleared = 0;
  const errors: number[] = [];

  for (const { id } of candidates) {
    try {
      const result = await computeTasteMatches(id);
      await (prisma.user as any).update({
        where: { id },
        data: { taste_matches: result ?? null },
      });
      result ? computed++ : cleared++;
    } catch (err) {
      console.error(`taste-matches cron: failed for user ${id}`, err);
      errors.push(id);
    }
  }

  return Response.json({ computed, cleared, errors });
}
```

- [ ] **Step 2: Schedule it** — add to `vercel.json` `crons` array:

```json
    {
      "path": "/api/cron/taste-matches",
      "schedule": "30 3 * * *"
    }
```

- [ ] **Step 3: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "app/api/cron/taste-matches/route.ts"`
```bash
git add "app/api/cron/taste-matches/route.ts" vercel.json
git commit -m "feat: nightly taste-matches cron"
```

---

## Task 5: Profile data — read matches, on-demand pair, privacy

**Files:**
- Modify: `lib/server/profileData.ts`
- Modify: `lib/api/profileApi.ts`

- [ ] **Step 1: Extend the API types** in `lib/api/profileApi.ts`:

```ts
export interface TasteMatchPreview {
  userId: number;
  username: string;
  displayName: string | null;
  pct: number;
  sharedItems: number;
  sharedLists: number;
}

export interface YouTwo {
  pct: number;
  sharedItems: number;
  sharedLists: number;
}
```
Add to `ProfileResponse`:
```ts
  is_private: boolean;
  taste_matches: { twin: TasteMatchPreview | null; nemesis: TasteMatchPreview | null } | null; // owner-only
  you_two: YouTwo | null;
```

- [ ] **Step 2: Enforce privacy + populate the new fields** in `lib/server/profileData.ts`:

After loading `user`, select `profile_private` and `taste_matches` too (add to the `select` and the cast type: `profile_private: boolean; taste_matches: unknown;`).

Add, right after `const isOwner = viewerId === user.id;`:
```ts
  const isPrivate = (user as { profile_private: boolean }).profile_private;

  // Private profiles expose only identity to non-owners.
  if (isPrivate && !isOwner) {
    return {
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        bio: null,
        createdAt: user.createdAt.toISOString(),
        follower_count: 0,
        following_count: 0,
        archetype: null,
        archetype_stats: null,
      },
      lists: [],
      isOwner: false,
      viewerFollowsThem: false,
      theyFollowViewer: false,
      viewerHasBlocked: false,
      viewerIsBlocked: false,
      mutuals: null,
      is_private: true,
      taste_matches: null,
      you_two: null,
    };
  }
```

Compute `you_two` (when a non-owner viewer is present), before the final `return`:
```ts
  let youTwo: import("@/lib/api/profileApi").YouTwo | null = null;
  if (viewerId && !isOwner) {
    const [viewerRows, ownerRows] = await Promise.all([
      prisma.ranking.findMany({ where: { userId: viewerId, value: { gt: 0 } }, select: { itemId: true, value: true } }),
      prisma.ranking.findMany({ where: { userId: user.id, value: { gt: 0 } }, select: { itemId: true, value: true } }),
    ]) as { itemId: number; value: number }[][];
    const viewerMap = new Map(viewerRows.map((r) => [r.itemId, r.value]));
    const ownerMap = new Map(ownerRows.map((r) => [r.itemId, r.value]));
    // sharedLists: distinct lists containing an item both ranked.
    const sharedItemIds = [...viewerMap.keys()].filter((id) => ownerMap.has(id));
    let sharedLists = 0;
    if (sharedItemIds.length > 0) {
      const lists = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT itl."B") AS count
        FROM "_ItemToList" itl WHERE itl."A" IN (${Prisma.join(sharedItemIds)})
      `);
      sharedLists = Number(lists[0]?.count ?? 0);
    }
    youTwo = buildPairwise(viewerMap, ownerMap, sharedLists);
  }
```
Add imports at the top: `import { Prisma } from "@/app/generated/prisma/client";` and `import { buildPairwise } from "@/lib/server/tasteMatch";` and `import type { TasteMatches } from "@/lib/server/tasteMatch";`.

In the final `return`, add:
```ts
    is_private: isPrivate,
    taste_matches: isOwner
      ? (() => {
          const tm = user.taste_matches as TasteMatches | null;
          return tm ? { twin: tm.twin, nemesis: tm.nemesis } : null;
        })()
      : null,
    you_two: youTwo,
```

- [ ] **Step 3: tsc + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint lib/server/profileData.ts lib/api/profileApi.ts`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/server/profileData.ts lib/api/profileApi.ts
git commit -m "feat: profile taste matches + you-two + private gating"
```

---

## Task 6: Profile UI — card, you-two line, private state

**Files:**
- Modify: `app/(pages)/u/[username]/ProfileClient.tsx`

Read the file first to match its styling/components (it renders from `useGetProfileQuery`).

- [ ] **Step 1: Render the three pieces.** Using the profile data:
  - When `data.is_private && !data.isOwner`: render a centered "This profile is private" state (identity header only), and skip lists/stats.
  - When `data.isOwner && data.taste_matches`: a card with twin + nemesis, each a `Link` to `/u/<username>` showing `"agrees X% · N lists"` (twin) and `"clashes X% · N lists"` (nemesis). Hide the card when `taste_matches` is null.
  - When `!data.isOwner && data.you_two`: a one-line "You two agree {pct}% across {sharedLists} lists".

Match existing class conventions (`text-rk-primary`, `text-rk-secondary`, `bg-rk-surface`, `border-rk-stroke`, rounded `[10px]`). Keep it a small block near the profile header.

- [ ] **Step 2: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "app/(pages)/u/[username]/ProfileClient.tsx"`
```bash
git add "app/(pages)/u/[username]/ProfileClient.tsx"
git commit -m "feat: profile taste-match card + you-two + private state"
```

---

## Task 7: Private profile — noindex + settings toggle

**Files:**
- Modify: `app/(pages)/u/[username]/page.tsx`
- Modify: settings profile page (`app/(pages)/settings/profile/page.tsx`) + `app/api/user/update/route.ts`

- [ ] **Step 1: noindex private profiles** — in `generateMetadata` of `app/(pages)/u/[username]/page.tsx`, after resolving the profile, if the profile is private set `robots: { index: false, follow: false }` and skip the OG profile image (fall back to no image / generic). Read the file to find where `result.profile` is available; add a `profile_private` field to whatever `resolveProfileParam` selects (read `lib/server/resolveProfile.ts` and add the column to its select + returned type).

- [ ] **Step 2: Settings toggle** — read `app/(pages)/settings/profile/page.tsx` and `app/api/user/update/route.ts`. Add a "Private profile" boolean toggle following the existing field pattern (e.g. how `bio`/`display_name` are edited): include `profile_private` in the update route's accepted body (validate it's a boolean) and persist via `prisma.user.update`. Wire the toggle in the settings UI to the same update mutation the page already uses.

- [ ] **Step 3: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "app/(pages)/u/[username]/page.tsx" "app/(pages)/settings/profile/page.tsx" app/api/user/update/route.ts`
```bash
git add "app/(pages)/u/[username]/page.tsx" "app/(pages)/settings/profile/page.tsx" app/api/user/update/route.ts lib/server/resolveProfile.ts
git commit -m "feat: private profile toggle + noindex"
```

---

## Task 8: Full verification + final review

- [ ] **Step 1: Suite + types + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
npx eslint lib/server/tasteMatch.ts __tests__/tasteMatch.test.ts "app/api/cron/taste-matches/route.ts" lib/server/profileData.ts lib/api/profileApi.ts "app/(pages)/u/[username]/ProfileClient.tsx" "app/(pages)/u/[username]/page.tsx"
```
Expected: tsc clean; all tests pass; no new lint errors.

- [ ] **Step 2: Final review subagent** over all new/changed files — focus: privacy (private users never appear as a match candidate or subject; private profile leaks nothing to non-owners), correctness of the aggregation, and that twin/nemesis are owner-only.

- [ ] **Step 3: Manual / staging checklist**
- Run the cron locally with the `Bearer $CRON_SECRET` header; confirm `taste_matches` populates.
- Own profile shows twin + nemesis; another profile shows "you two".
- Toggle private → your profile hides data to others + is `noindex`; you still see your own.
- A private user never appears as anyone's twin/nemesis.
- Run the DB migration: `npx prisma migrate dev --name taste_identity`.

---

## Notes

- The DB migration must be run by the human against their database (the plan only runs `prisma generate` so tsc passes). Flag this in the final report.
- All pair math reuses `scoreRankerPair`; the only new pure logic is `pickTwinNemesis` (Task 2, tested).
- Keep Prisma raw queries identical in style to `lib/server/payoff.ts`; cast results through typed shapes, avoid `prisma.x as any` where a typed call works (the cron mirrors archetypes, which uses `as any` — matching that file is fine).
