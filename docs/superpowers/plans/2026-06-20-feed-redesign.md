# Feed Redesign (discovery-first) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the feed into a discovery-first layout with rich list cards (generated cover, real tier strip, divisiveness, twin hook), plus a social hook on network items.

**Architecture:** Pure card helpers + a `buildRichListCard` server fn (reusing the aggregation averaging) feed a new `GET /api/feed/discover-lists` (`{ madeForYou, trending }`). `/api/feed` network items gain an `align%`. New `GeneratedCover` + `RichListCard` components; the feed page restructures into four sections. No DB migration — all from existing data.

**Tech Stack:** Next.js 16, React 19, Prisma/Postgres, RTK Query, vitest.

**Environment note:** sandbox may OOM on `tsc`/`vitest` late in the session — run `npx eslint <files>`; attempt the single vitest file for TDD tasks, else implement from the test and note host verification. `no-explicit-any` is now disabled in eslint config, so `as any` is fine.

---

## File Structure

- Create `lib/server/feedCards.ts` (pure helpers + `buildRichListCard`) + `__tests__/feedCards.test.ts`.
- Create `app/api/feed/discover-lists/route.ts`.
- Modify `app/api/feed/route.ts` (network `align%`).
- Modify `lib/api/feedApi.ts` (`RichListCard`, fetcher, `align` on `NetworkFeedItem`).
- Create `app/components/feed/GeneratedCover.tsx` + `app/components/feed/RichListCard.tsx`.
- Modify `app/(pages)/feed/page.tsx` (four-section restructure).

---

## Task 1: Pure card helpers (TDD)

**Files:** Create `lib/server/feedCards.ts`, `__tests__/feedCards.test.ts`.

- [ ] **Step 1: Failing test** `__tests__/feedCards.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { coverColorsFromItems, divisivenessLabel, tierStripFromPlacements } from "@/lib/server/feedCards";

const tiers = [
  { title: "S", value: 6 }, { title: "A", value: 5 }, { title: "B", value: 4 },
  { title: "C", value: 3 }, { title: "D", value: 2 }, { title: "F", value: 1 },
];

describe("coverColorsFromItems", () => {
  it("takes the first N non-null colors", () => {
    expect(coverColorsFromItems([{ color: "#111" }, { color: null }, { color: "#222" }], 2)).toEqual(["#111", "#222"]);
  });
  it("falls back to a palette when none", () => {
    expect(coverColorsFromItems([{ color: null }], 3).length).toBe(3);
  });
});

describe("divisivenessLabel", () => {
  it("classifies by avg sd", () => {
    expect(divisivenessLabel(0)).toBe("calm");
    expect(divisivenessLabel(1.0)).toBe("spicy");
    expect(divisivenessLabel(2.0)).toBe("divisive");
  });
});

describe("tierStripFromPlacements", () => {
  it("counts items into their consensus tier (avg rounded), excludes value 0 and unranked", () => {
    const items = [
      { rankings: [{ value: 6 }, { value: 6 }] },     // avg 6 → S
      { rankings: [{ value: 5 }, { value: 5 }] },     // avg 5 → A
      { rankings: [{ value: 6 }, { value: 4 }] },     // avg 5 → A
      { rankings: [{ value: 0 }] },                   // N/A only → skipped
      { rankings: [] },                               // unranked → skipped
    ];
    const strip = tierStripFromPlacements(items, tiers);
    const byTitle = Object.fromEntries(strip.map((s) => [s.tierTitle, s.itemCount]));
    expect(byTitle.S).toBe(1);
    expect(byTitle.A).toBe(2);
    expect(byTitle.B).toBe(0);
    expect(strip.find((s) => s.value === 0)).toBeUndefined();
    expect(strip).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run, confirm fail.** `npx vitest run __tests__/feedCards.test.ts`.

- [ ] **Step 3: Implement** `lib/server/feedCards.ts`:
```ts
import { DIVISIVE_SD_MID, DIVISIVE_SD_HIGH } from "@/lib/insightsConfig";

const FALLBACK_PALETTE = ["#C44545", "#E08C2C", "#97C459", "#5DCAA5", "#85B7EB", "#AFA9EC"];

export function coverColorsFromItems(items: { color: string | null }[], n = 5): string[] {
  const colors = items.map((i) => i.color).filter((c): c is string => !!c).slice(0, n);
  if (colors.length > 0) return colors;
  return FALLBACK_PALETTE.slice(0, n);
}

export function divisivenessLabel(avgSd: number): "calm" | "spicy" | "divisive" {
  if (avgSd >= DIVISIVE_SD_HIGH) return "divisive";
  if (avgSd >= DIVISIVE_SD_MID) return "spicy";
  return "calm";
}

export interface TierStripEntry { tierTitle: string; value: number; itemCount: number }

export function tierStripFromPlacements(
  items: { rankings: { value: number }[] }[],
  sortedTiers: { title: string; value: number }[]
): TierStripEntry[] {
  const tiers = sortedTiers.filter((t) => t.value > 0);
  const counts = new Map<number, number>(tiers.map((t) => [t.value, 0]));
  for (const item of items) {
    const vals = item.rankings.map((r) => r.value).filter((v) => v !== 0);
    if (vals.length === 0) continue;
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    if (counts.has(avg)) counts.set(avg, (counts.get(avg) ?? 0) + 1);
  }
  return tiers.map((t) => ({ tierTitle: t.title, value: t.value, itemCount: counts.get(t.value) ?? 0 }));
}
```

- [ ] **Step 4: Run, confirm pass. eslint. Commit.**
```bash
git add lib/server/feedCards.ts __tests__/feedCards.test.ts
git commit -m "feat: feed card pure helpers (TDD)"
```

---

## Task 2: `buildRichListCard` + sd averaging

**Files:** Modify `lib/server/feedCards.ts`; read `lib/server/aggregation.ts` + `lib/itemDistribution.ts`.

- [ ] **Step 1: Add the card builder.** `buildRichListCard(list)` takes a list with `items: { color, rankings: { value }[] }[]`, `tiers`, counts, and returns a `RichListCard` minus `twinSignal`:
```ts
import { computeItemDistribution } from "@/lib/itemDistribution";

export interface RichListCard {
  id: number; short_id: string; slug: string; title: string;
  img: string | null; item_count: number; ranking_count: number;
  coverColors: string[];
  tierStrip: TierStripEntry[];
  divisiveness: "calm" | "spicy" | "divisive";
  twinSignal: { count: number; sampleName: string | null } | null;
}

export function buildRichListCard(list: {
  id: number; short_id: string; slug: string; title: string; img: string | null;
  items: { color: string | null; rankings: { value: number }[] }[];
  tiers: { title: string; value: number }[];
  ranking_count: number;
}): RichListCard {
  const sortedTiers = [...list.tiers].filter((t) => t.value > 0).sort((a, b) => b.value - a.value);
  // average per-item sd via the shared distribution helper
  let sdSum = 0, sdCount = 0;
  for (const item of list.items) {
    const m = new Map<number, number>();
    for (const r of item.rankings) if (r.value !== 0) m.set(r.value, (m.get(r.value) ?? 0) + 1);
    const d = computeItemDistribution(m, sortedTiers);
    if (d.total > 0) { sdSum += d.sd; sdCount++; }
  }
  const avgSd = sdCount > 0 ? sdSum / sdCount : 0;
  return {
    id: list.id, short_id: list.short_id, slug: list.slug, title: list.title, img: list.img,
    item_count: list.items.length, ranking_count: list.ranking_count,
    coverColors: coverColorsFromItems(list.items),
    tierStrip: tierStripFromPlacements(list.items, sortedTiers),
    divisiveness: divisivenessLabel(avgSd),
    twinSignal: null,
  };
}
```

- [ ] **Step 2: eslint + commit.**
```bash
git add lib/server/feedCards.ts
git commit -m "feat: buildRichListCard"
```

---

## Task 3: `GET /api/feed/discover-lists`

**Files:** Create `app/api/feed/discover-lists/route.ts`. Read `app/api/feed/route.ts` (block/follow patterns) + `app/api/feed/discover/route.ts` (taste_matches.top read).

- [ ] **Step 1: Implement.** Auth via `getAuthedViewer`. Compute `excludeIds` (blocks) and the set of list ids the viewer already ranked (`prisma.ranking.findMany where userId=viewer, distinct list via items` — or simpler, a query of lists the viewer ranked). Then:
  - **madeForYou:** read `(prisma.user as any).findUnique({ where:{id:viewer.id}, select:{ taste_matches:true } })`; take `taste_matches.top[].userId` (the twins). Find distinct public, non-deleted, non-takendown lists those twins have ranked (value>0), excluding viewer-ranked lists and blocked authors, cap 8. For each list load items (`color`, `rankings:{value}`) + tiers + ranking count + the twin rankers (to build `twinSignal`: count of twins who ranked it + one non-private twin's display name). `buildRichListCard` then set `twinSignal`. Order by twin count desc.
  - **trending:** public/non-deleted/non-takendown lists ordered by `ranking_count` desc (use the list's ranking count; `(prisma.list as any)` if needed), cap 8, excluding ids already in madeForYou. `buildRichListCard`, `twinSignal` null.
  - Return `{ madeForYou, trending }`. Keep queries bounded (the per-card item+ranking load is the cost — cap lists at 8 each).

- [ ] **Step 2: eslint + commit.**
```bash
git add app/api/feed/discover-lists/route.ts
git commit -m "feat: discover-lists endpoint (made-for-you + trending)"
```

---

## Task 4: Network align% enrichment

**Files:** Modify `app/api/feed/route.ts`, `lib/api/feedApi.ts`.

- [ ] **Step 1: feedApi type.** Add `align?: { pct: number } | null` to `NetworkFeedItem`.

- [ ] **Step 2: enrich network items.** After the network `page` is built (bounded by `limit`), for each item compute the viewer-vs-actor alignment on that list: load the viewer's and the actor's rankings for `list.id` (value>0), `scoreRankerPair`, and set `align: both>0 ? { pct: round(within/both*100) } : null`. To bound cost, batch: one `prisma.ranking.findMany` for the viewer across all page list ids, one for the actors across (actorId,listId) pairs, then group in JS. (If simpler, per-item is acceptable given page ≤ 20.) Attach `align` to each mapped network item.

- [ ] **Step 3: eslint + commit.**
```bash
git add app/api/feed/route.ts lib/api/feedApi.ts
git commit -m "feat: network feed align% hook"
```

---

## Task 5: GeneratedCover + RichListCard + feedApi

**Files:** Create `app/components/feed/GeneratedCover.tsx`, `app/components/feed/RichListCard.tsx`; modify `lib/api/feedApi.ts`.

Read the current feed card styling in `app/(pages)/feed/page.tsx` for tokens/classes; read `lib/listUrl.ts` for the rank href.

- [ ] **Step 1: feedApi.** Export `RichListCard` (mirror the server type) + a `fetchDiscoverLists(): Promise<{ madeForYou: RichListCard[]; trending: RichListCard[] }>` (GET `/api/feed/discover-lists`).

- [ ] **Step 2: `GeneratedCover`** — props `{ colors: string[]; title: string }`. Flat diagonal color-block band (e.g. equal-flex colored spans) with the title overlaid; fixed height matching the image cover. Dark-theme tokens.

- [ ] **Step 3: `RichListCard`** — props `{ card: RichListCard }`. Cover = `img` via `next/image` (ImageKitLoader) else `<GeneratedCover>`. Below: title; stats line `{item_count} items · {ranking_count} ranked · {divisiveness}`; tier strip (a flex row of bars, each `flex: itemCount` , tier color from a TIER_BG map, min flex 1 so empty tiers show a sliver or are skipped — skip zero-count tiers); the twin hook pill when `card.twinSignal` ("{count} taste twins ranked this" / "@{sampleName} + N"); a "Rank it →" link to `/s/${slug}-${short_id}/s`. Match feed styling (`#0F1828`/`#1E2C44`/text tokens).

- [ ] **Step 4: eslint + commit.**
```bash
git add lib/api/feedApi.ts "app/components/feed/GeneratedCover.tsx" "app/components/feed/RichListCard.tsx"
git commit -m "feat: GeneratedCover + RichListCard"
```

---

## Task 6: Feed page restructure

**Files:** Modify `app/(pages)/feed/page.tsx`.

- [ ] **Step 1: Load discover lists.** Add a `useQuery`/RTK call to `fetchDiscoverLists` (page-1 once). Keep the existing network infinite query + discover-users query.

- [ ] **Step 2: Sections (top→bottom):**
  1. "Made for you" — `RichListCard` grid (2-up desktop via `grid-cols-1 sm:grid-cols-2`), only when `madeForYou.length > 0`.
  2. "Trending" — `RichListCard` grid from `trending`.
  3. "From your network" — the existing network items, compacted into rows: actor + "ranked {list}", the `align%` hook when present (colored), tiny tier dots, a "Compare" link to the list. Keep poll/infinite-scroll here.
  4. "People who rank like you" — the existing `DiscoverUserRow` chips (unchanged).
  Remove/replace the old `FallbackListCard` grid (superseded by Trending) and the bare network cards.

- [ ] **Step 3: Loading/empty states** for each section (skeletons; omit empty "Made for you"). Feed never fully empty (Trending fills).

- [ ] **Step 4: eslint + commit.**
```bash
git add "app/(pages)/feed/page.tsx"
git commit -m "feat: discovery-first feed restructure"
```

---

## Task 7: Verification + final review

- [ ] **Step 1: Suite + types + lint** (on host if sandbox OOMs):
```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
npx eslint lib/server/feedCards.ts __tests__/feedCards.test.ts app/api/feed/discover-lists/route.ts app/api/feed/route.ts "app/components/feed/RichListCard.tsx" "app/(pages)/feed/page.tsx"
```

- [ ] **Step 2: Final review subagent** — focus: discovery queries bounded (caps, no N+1 blowup); blocked authors + private twins excluded; twin hook only names a public twin; network align% only when viewer ranked; generated cover never renders empty; feed never empty (cold-start → Trending).

- [ ] **Step 3: Manual / staging:**
- Account with twins → "Made for you" shows twin-ranked lists + hook; follow/blocked excluded.
- Fresh account (no twins) → "Made for you" omitted, "Trending" leads.
- Lists with no image show generated covers; tier strips reflect crowd placement; divisiveness label matches.
- Network rows show align% only where you've ranked that list.

---

## Notes

- No DB migration — all from existing rankings/items/tiers/taste data.
- Only new pure logic is the Task 1 helpers (tested); `buildRichListCard` reuses `computeItemDistribution`.
- The cost center is the per-card item+ranking load — keep section caps (~8) and avoid loading rankings for lists you won't show.
