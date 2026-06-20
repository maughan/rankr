# Consensus + Per-Item Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any item in the community view be expanded to show how the crowd spread it across tiers (with the viewer's own pick marked), and flag divisive items with a contention dot + a "most divisive" sort — on both `/s/` and `/r/`.

**Architecture:** One pure helper `computeItemDistribution(countsByValue, tiers)` feeds both surfaces. `/s/` builds the counts client-side from already-loaded `item.rankings`; `/r/` adds a privacy-safe `groupBy` count to `computeListAggregates` and ships the distribution per item. A shared `<ItemDistribution>` component renders the histogram; `ItemCard` gains a contention dot.

**Tech Stack:** Next.js 16, React 19, Prisma/Postgres, RTK Query, vitest.

---

## File Structure

- Create `lib/itemDistribution.ts` — pure helper + `divisiveness`.
- Create `__tests__/itemDistribution.test.ts`.
- Modify `lib/insightsConfig.ts` — `DIVISIVE_SD_MID`, `DIVISIVE_SD_HIGH`.
- Create `app/components/item/ItemDistribution.tsx` — shared histogram component.
- Modify `app/components/item/ItemCard.tsx` — optional `contention` dot.
- Modify `lib/server/aggregation.ts` — attach `distribution` to `AggregatedItem`.
- Modify `lib/api/listsApi.ts` — `SharedListItem.distribution` + `SharedListTier` order helper (types).
- Modify `app/(pages)/s/[id]/ListDetail.tsx` — counts, refactor divisive compute, inline expand, dot, sort.
- Modify `app/(pages)/r/[token]/page.tsx` — inline expand, dot, sort.

---

## Task 1: `computeItemDistribution` + `divisiveness` (TDD)

**Files:**
- Modify: `lib/insightsConfig.ts`
- Create: `lib/itemDistribution.ts`
- Test: `__tests__/itemDistribution.test.ts`

- [ ] **Step 1: Add thresholds** to `lib/insightsConfig.ts`:

```ts
export const DIVISIVE_SD_MID = 0.8;
export const DIVISIVE_SD_HIGH = 1.3;
```

- [ ] **Step 2: Write the failing test** `__tests__/itemDistribution.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeItemDistribution, divisiveness } from "@/lib/itemDistribution";

const tiers = [
  { title: "S", value: 6 },
  { title: "A", value: 5 },
  { title: "B", value: 4 },
  { title: "C", value: 3 },
  { title: "D", value: 2 },
  { title: "F", value: 1 },
]; // descending

describe("computeItemDistribution", () => {
  it("unanimous item → sd 0, 100% in one tier", () => {
    const r = computeItemDistribution(new Map([[6, 8]]), tiers);
    expect(r.total).toBe(8);
    expect(r.sd).toBe(0);
    const s = r.distribution.find((d) => d.value === 6)!;
    expect(s.count).toBe(8);
    expect(s.pct).toBe(100);
  });

  it("a far split (S vs F) is more divisive than an adjacent split (S vs A)", () => {
    const far = computeItemDistribution(new Map([[6, 5], [1, 5]]), tiers);
    const near = computeItemDistribution(new Map([[6, 5], [5, 5]]), tiers);
    expect(far.sd).toBeGreaterThan(near.sd);
  });

  it("pct values reflect the split", () => {
    const r = computeItemDistribution(new Map([[6, 3], [5, 1]]), tiers);
    expect(r.total).toBe(4);
    expect(r.distribution.find((d) => d.value === 6)!.pct).toBe(75);
    expect(r.distribution.find((d) => d.value === 5)!.pct).toBe(25);
  });

  it("empty → total 0, sd 0, all counts 0", () => {
    const r = computeItemDistribution(new Map(), tiers);
    expect(r.total).toBe(0);
    expect(r.sd).toBe(0);
    expect(r.distribution.every((d) => d.count === 0 && d.pct === 0)).toBe(true);
    expect(r.distribution).toHaveLength(6);
  });
});

describe("divisiveness", () => {
  it("classifies by thresholds", () => {
    expect(divisiveness(0)).toBe("low");
    expect(divisiveness(1.0)).toBe("mid");
    expect(divisiveness(2.0)).toBe("high");
  });
});
```

- [ ] **Step 3: Run, confirm fail**

Run: `npx vitest run __tests__/itemDistribution.test.ts`
Expected: FAIL (module missing). If vitest errors on the rolldown binding, `npm install --no-save @rolldown/binding-linux-arm64-gnu` then retry.

- [ ] **Step 4: Implement** `lib/itemDistribution.ts`:

```ts
import { DIVISIVE_SD_MID, DIVISIVE_SD_HIGH } from "@/lib/insightsConfig";

export interface ItemDistribution {
  distribution: { tierTitle: string; value: number; count: number; pct: number }[];
  sd: number;
  total: number;
}

export function computeItemDistribution(
  countsByValue: Map<number, number>,
  sortedTiers: { title: string; value: number }[]
): ItemDistribution {
  let total = 0;
  for (const c of countsByValue.values()) total += c;

  const distribution = sortedTiers.map((t) => {
    const count = countsByValue.get(t.value) ?? 0;
    return {
      tierTitle: t.title,
      value: t.value,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  if (total === 0) return { distribution, sd: 0, total: 0 };

  // sd over tier indices (position in the sorted list), weighted by count.
  const idxOf = new Map(sortedTiers.map((t, i) => [t.value, i]));
  let mean = 0;
  for (const [v, c] of countsByValue) mean += (idxOf.get(v) ?? 0) * c;
  mean /= total;
  let variance = 0;
  for (const [v, c] of countsByValue) {
    const i = idxOf.get(v) ?? 0;
    variance += c * (i - mean) ** 2;
  }
  variance /= total;

  return { distribution, sd: Math.sqrt(variance), total };
}

export function divisiveness(sd: number): "low" | "mid" | "high" {
  if (sd >= DIVISIVE_SD_HIGH) return "high";
  if (sd >= DIVISIVE_SD_MID) return "mid";
  return "low";
}
```

- [ ] **Step 5: Run, confirm pass.** `npx vitest run __tests__/itemDistribution.test.ts` — all pass.

- [ ] **Step 6: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint lib/itemDistribution.ts __tests__/itemDistribution.test.ts lib/insightsConfig.ts`
```bash
git add lib/itemDistribution.ts __tests__/itemDistribution.test.ts lib/insightsConfig.ts
git commit -m "feat: item distribution helper + divisiveness"
```

---

## Task 2: `<ItemDistribution>` component + `ItemCard` contention dot

**Files:**
- Create: `app/components/item/ItemDistribution.tsx`
- Modify: `app/components/item/ItemCard.tsx`

Read `app/components/item/ItemCard.tsx` (for class conventions + the tier colors map used elsewhere — `TIER_STYLE` appears in `ListDetail.tsx`).

- [ ] **Step 1: Build the histogram component.** `app/components/item/ItemDistribution.tsx`:

```tsx
"use client";

import type { ItemDistribution as Dist } from "@/lib/itemDistribution";

const TIER_BG: Record<string, string> = {
  S: "#C44545", A: "#E08C2C", B: "#97C459", C: "#5DCAA5", D: "#85B7EB", F: "#AFA9EC",
};

export function ItemDistribution({
  dist,
  yourValue,
}: {
  dist: Dist;
  yourValue: number | null;
}) {
  if (dist.total === 0) {
    return <p className="text-[12px] text-rk-muted py-2">Not enough rankings yet.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5 py-2">
      {dist.distribution.map((d) => (
        <div key={d.value} className="flex items-center gap-2">
          <span
            className="w-5 text-center text-[11px] font-[500] rounded-[3px]"
            style={{ color: TIER_BG[d.tierTitle] ?? "#888" }}
          >
            {d.tierTitle}
          </span>
          <div className="flex-1 h-[14px] bg-rk-surface rounded-[3px] overflow-hidden">
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${d.pct}%`, backgroundColor: TIER_BG[d.tierTitle] ?? "#888", opacity: d.count ? 1 : 0 }}
            />
          </div>
          <span className="w-10 text-right text-[11px] text-rk-muted">{d.pct}%</span>
          {yourValue === d.value && (
            <span className="text-[10px] font-[500] text-rk-accent w-8">you</span>
          )}
          {yourValue !== d.value && <span className="w-8" />}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add the contention dot to `ItemCard`.** Add an optional prop and a small corner dot:

In `Props`: `contention?: "mid" | "high";`. In the component, when `contention` is set, render an absolutely-positioned dot in the top-right corner of the card (amber for "mid" `#E08C2C`, red for "high" `#C44545`):
```tsx
{contention && (
  <span
    aria-label="divisive item"
    className="absolute top-1 right-1 w-2 h-2 rounded-full z-10"
    style={{ backgroundColor: contention === "high" ? "#C44545" : "#E08C2C" }}
  />
)}
```
Place it inside both the image and color-block card branches (the outer `cls` div is `relative`). Destructure `contention` in the function signature.

- [ ] **Step 3: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "app/components/item/ItemDistribution.tsx" "app/components/item/ItemCard.tsx"`
```bash
git add "app/components/item/ItemDistribution.tsx" "app/components/item/ItemCard.tsx"
git commit -m "feat: item distribution histogram + contention dot"
```

---

## Task 3: `/r/` aggregation ships per-item distribution

**Files:**
- Modify: `lib/server/aggregation.ts`
- Modify: `lib/api/listsApi.ts` (the `SharedListItem` type)

Read `lib/server/aggregation.ts` fully (note `AggregatedItem`, `AggregatedTier`, the existing `groupBy` avg query, and `list.tiers`).

- [ ] **Step 1: Extend `AggregatedItem`** with `distribution: ItemDistribution` (import the type). Import `computeItemDistribution`.

- [ ] **Step 2: Add the count query + attach distribution.** After the existing avg `groupBy`, add:
```ts
  const distGrouped = (await prisma.ranking.groupBy({
    by: ["itemId", "value"],
    where: { itemId: { in: itemIds }, value: { not: 0 } },
    _count: { id: true },
  })) as { itemId: number; value: number; _count: { id: number } }[];

  const countsByItem = new Map<number, Map<number, number>>();
  for (const row of distGrouped) {
    let m = countsByItem.get(row.itemId);
    if (!m) { m = new Map(); countsByItem.set(row.itemId, m); }
    m.set(row.value, row._count.id);
  }

  const sortedTiers = [...list.tiers].sort((a, b) => b.value - a.value);
```
Then where `items` is built for the return value, attach:
```ts
    distribution: computeItemDistribution(countsByItem.get(item.id) ?? new Map(), sortedTiers),
```
(Map over `list.items` to add the field rather than returning the raw rows, if the current code returns `list.items` directly.)

- [ ] **Step 3: Mirror the type** in `lib/api/listsApi.ts` — add `distribution: ItemDistribution` (import the type) to `SharedListItem`. (Confirm the `/r/` client type is `SharedListItem`; if the aggregate uses a different client type, add it there.)

- [ ] **Step 4: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint lib/server/aggregation.ts lib/api/listsApi.ts`
Expected: tsc clean; no new lint errors.
```bash
git add lib/server/aggregation.ts lib/api/listsApi.ts
git commit -m "feat: ship per-item distribution in /r aggregate"
```

---

## Task 4: `/s/` ListDetail — counts, refactor, expand, dot, sort

**Files:**
- Modify: `app/(pages)/s/[id]/ListDetail.tsx`

Read the relevant regions: the existing most-divisive `useMemo` (~lines 290-332), the community tier-row render, and how items map to `ItemCard`.

- [ ] **Step 1: Per-item distribution map.** Add a `useMemo` building, for each item, `computeItemDistribution(countsByValue, sortedTiers)` from `item.rankings` (`value !== 0` → `value->count` map). Key by item id. Reuse this for the divisive lookup.

- [ ] **Step 2: Refactor the existing most-divisive computation** to read `sd` from the per-item distribution map (drop the duplicated inline variance math; use `computeItemDistribution(...).sd`). Keep the existing divisive-item card behaviour intact.

- [ ] **Step 3: Inline expand.** Add `expandedItemId` state. In the community view (not the "your ranking" view), make each item toggle `expandedItemId`. When expanded, render `<ItemDistribution dist={distMap.get(item.id)} yourValue={myRankingValueForItem(item.id) ?? null} />` in a full-width row directly beneath the item's tier row. `ItemCard` stays presentational — wrap it in a clickable element in `ListDetail` (don't add onClick to `ItemCard`). Only show the expander in the community view.

- [ ] **Step 4: Contention dot.** Pass `contention={divisiveness(distMap.get(item.id)?.sd ?? 0)}` to `ItemCard` (mapping `"low"` → omit, i.e. pass only `"mid"`/`"high"`), gated on `distMap.get(item.id)!.total >= MIN_ITEM_RANKERS_FOR_BADGE`.

- [ ] **Step 5: "Most divisive" sort.** Add a toggle in the community view header. When on, sort items within their display by `sd` desc. Applies to the community view only; does not reorder the viewer's own-ranking view.

- [ ] **Step 6: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "app/(pages)/s/[id]/ListDetail.tsx"`
Expected: tsc clean; no NEW lint errors (the file has pre-existing `any` debt — don't refactor it).
```bash
git add "app/(pages)/s/[id]/ListDetail.tsx"
git commit -m "feat: per-item distribution expand + contention on /s"
```

---

## Task 5: `/r/` SharedListPage — expand, dot, sort

**Files:**
- Modify: `app/(pages)/r/[token]/page.tsx`

This view already renders community tier rows from `list.tiers` + `list.items`, and loads `myRanking`. Each item now carries `distribution` (from Task 3).

- [ ] **Step 1: Inline expand** — same pattern as Task 4 Step 3: `expandedItemId` state, clickable wrapper around `ItemCard`, render `<ItemDistribution dist={item.distribution} yourValue={...} />` beneath. The viewer's value comes from the loaded `myRanking` (find the tier whose `items` includes this item id → its value, or null).

- [ ] **Step 2: Contention dot** — `contention={divisiveness(item.distribution.sd)}` (omit for "low"), gated on `item.distribution.total >= MIN_ITEM_RANKERS_FOR_BADGE`.

- [ ] **Step 3: "Most divisive" sort** — toggle in the header; sort by `item.distribution.sd` desc when on.

- [ ] **Step 4: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "app/(pages)/r/[token]/page.tsx"`
```bash
git add "app/(pages)/r/[token]/page.tsx"
git commit -m "feat: per-item distribution expand + contention on /r"
```

---

## Task 6: Verification + final review

- [ ] **Step 1: Suite + types + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
npx eslint lib/itemDistribution.ts __tests__/itemDistribution.test.ts "app/components/item/ItemDistribution.tsx" "app/components/item/ItemCard.tsx" lib/server/aggregation.ts "app/(pages)/s/[id]/ListDetail.tsx" "app/(pages)/r/[token]/page.tsx"
```
Expected: tsc clean; all tests pass (prior + new `itemDistribution`); no new lint errors.

- [ ] **Step 2: Final review subagent** — focus: `/r/` ships only counts (no individual rankings); pct/sd correctness; the own-pick marker uses the viewer's own ranking; sort/dot gated on `MIN_ITEM_RANKERS_FOR_BADGE`; the `ListDetail` divisive refactor preserves prior behaviour.

- [ ] **Step 3: Manual / staging checklist**
- `/s/` and `/r/`: expand an item → histogram with correct %s + "you" marker on your tier.
- Contention dots appear on divisive items only (and only past the ranker gate).
- "Most divisive" sort reorders the community view; the own-ranking view is unaffected.
- A list with <3 rankers per item shows the muted "not enough rankings yet".

---

## Notes

- No DB migration — `/r/` distribution is computed at request time from existing rankings.
- The only new pure logic is `computeItemDistribution`/`divisiveness` (Task 1, tested); the `/s/` divisive-item refactor must keep the existing card behaviour.
- Keep Prisma raw/group queries in the established style; the aggregation `groupBy` mirrors `computePayoff`'s `itemValueDist`.
