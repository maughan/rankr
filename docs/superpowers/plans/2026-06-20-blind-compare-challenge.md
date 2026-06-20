# Blind-Compare Challenge Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a shared verdict link into a recruiting funnel — opening `/c/[ref]` makes the visitor rank the list blind, then reveals how they align with the sharer and the crowd.

**Architecture:** New `/c/[ref]` route reuses the existing signed verdict ref (`lib/share/verdictRef.ts`), the existing blind rank page (`/r/[token]/s`), and the existing payoff math (`computePayoff`, `scoreRankerPair`). `/c/[ref]` renders a hook (not-yet-ranked) or a reveal (ranked); the rank page gains a `?ref=` mode that shows a challenge banner and redirects back to `/c/[ref]` on submit. A new `/api/c/[ref]/reveal` endpoint assembles the comparison via a small pure helper.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma/Postgres, RTK Query, `jsonwebtoken`, vitest.

---

## File Structure

- Create `lib/server/reveal.ts` — pure helper that shapes the reveal DTO from payoff + pairwise-sharer score. One responsibility: assembling/guarding the reveal numbers. Unit-tested.
- Create `__tests__/reveal.test.ts` — tests for the helper.
- Create `app/api/c/[ref]/reveal/route.ts` — verify ref, load rankings, call `computePayoff` + `scoreRankerPair`, return `buildReveal(...)`.
- Create `app/(pages)/c/[ref]/page.tsx` — server: verdict OG metadata + `noindex`, resolves list/share_token/sharer handle, renders the client.
- Create `app/(pages)/c/[ref]/ChallengeClient.tsx` — client: hook vs reveal state.
- Modify `app/(pages)/r/[token]/s/page.tsx` — read `?ref`, show challenge banner, redirect to `/c/[ref]` on submit.
- Modify `app/api/r/[token]/share-ref/route.ts` — mint `/c/[ref]` URLs.
- Modify `app/components/payoff/index.tsx` — share button uses the `/c/` URL returned by the mint route (no change needed if it consumes `url` verbatim — verify).
- Modify `lib/analytics/events.ts` — add challenge funnel events.

---

## Task 1: Reveal shaping helper (pure, TDD)

**Files:**
- Create: `lib/server/reveal.ts`
- Test: `__tests__/reveal.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildReveal } from "@/lib/server/reveal";
import type { PayoffData } from "@/lib/server/payoff";

const payoff = {
  alignment: { pct: 72, withinOneTier: 0, perfectMatches: 0, rankerCount: 40 },
  hottestTake: null,
} as unknown as PayoffData;

describe("buildReveal", () => {
  it("computes vsSharerPct from within/both and keeps the handle", () => {
    const r = buildReveal({
      payoff,
      vsSharer: { within: 8, both: 10 },
      sharerHandle: "rhys",
    });
    expect(r.vsSharerPct).toBe(80);
    expect(r.sharerHandle).toBe("rhys");
    expect(r.vsCrowdPct).toBe(72);
    expect(r.rankerCount).toBe(40);
  });

  it("hides the sharer when there is no overlap (both === 0)", () => {
    const r = buildReveal({
      payoff,
      vsSharer: { within: 0, both: 0 },
      sharerHandle: "rhys",
    });
    expect(r.vsSharerPct).toBeNull();
    expect(r.sharerHandle).toBeNull();
  });

  it("hides the sharer when there are no sharer rankings (null)", () => {
    const r = buildReveal({ payoff, vsSharer: null, sharerHandle: "rhys" });
    expect(r.vsSharerPct).toBeNull();
    expect(r.sharerHandle).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/reveal.test.ts`
Expected: FAIL — cannot resolve `@/lib/server/reveal`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { PayoffData } from "@/lib/server/payoff";

export interface RevealData {
  sharerHandle: string | null;
  vsSharerPct: number | null;
  vsCrowdPct: number;
  hottestTake: PayoffData["hottestTake"];
  rankerCount: number;
}

export function buildReveal(args: {
  payoff: PayoffData;
  vsSharer: { within: number; both: number } | null;
  sharerHandle: string | null;
}): RevealData {
  const { payoff, vsSharer, sharerHandle } = args;
  const vsSharerPct =
    vsSharer && vsSharer.both > 0
      ? Math.round((vsSharer.within / vsSharer.both) * 100)
      : null;
  return {
    sharerHandle: vsSharerPct !== null ? sharerHandle : null,
    vsSharerPct,
    vsCrowdPct: payoff.alignment.pct,
    hottestTake: payoff.hottestTake,
    rankerCount: payoff.alignment.rankerCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/reveal.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/server/reveal.ts __tests__/reveal.test.ts
git commit -m "feat: reveal shaping helper for challenge flow"
```

---

## Task 2: Reveal API route

**Files:**
- Create: `app/api/c/[ref]/reveal/route.ts`

Mirrors the data loading in `app/api/og/verdict/route.ts` (read it first for the exact list/ranking query shapes and the identity `where` clause).

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyVerdictRef } from "@/lib/share/verdictRef";
import { computePayoff, scoreRankerPair } from "@/lib/server/payoff";
import { buildReveal } from "@/lib/server/reveal";
import { getAuthedViewer } from "@/lib/server/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

type Params = { params: Promise<{ ref: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { ref } = await params;
  const payload = verifyVerdictRef(ref);
  if (!payload) return NextResponse.json({ error: "Invalid ref" }, { status: 404 });

  const list = await prisma.list.findUnique({
    where: { id: payload.l },
    select: {
      visibility: true,
      createdBy: { select: { username: true, display_name: true } },
      items: { select: { id: true, name: true } },
      tiers: { select: { title: true, value: true } },
      _count: { select: { rankings: true } },
    },
  });
  if (!list || list.visibility !== "public") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const itemIds = list.items.map((i) => i.id);

  const viewer = await getAuthedViewer();
  const anonSession = (await cookies()).get("rankr_anon_session")?.value ?? null;

  const viewerWhere = viewer
    ? { userId: viewer.id, itemId: { in: itemIds }, value: { gt: 0 } }
    : anonSession
    ? { anonymous_session_token: anonSession, itemId: { in: itemIds }, value: { gt: 0 } }
    : null;
  if (!viewerWhere) return NextResponse.json({ error: "No ranking" }, { status: 404 });

  const viewerRankings = await prisma.ranking.findMany({
    where: viewerWhere,
    select: { itemId: true, value: true },
  });
  if (viewerRankings.length === 0) {
    return NextResponse.json({ error: "No ranking" }, { status: 404 });
  }

  const payoff = await computePayoff({
    listId: payload.l,
    items: list.items,
    tiers: list.tiers,
    userRankings: viewerRankings,
    currentUserId: viewer?.id ?? null,
    shareToken: null,
  });

  const sharerWhere =
    payload.i.k === "user"
      ? { userId: payload.i.id, itemId: { in: itemIds }, value: { gt: 0 } }
      : { anonymous_session_token: payload.i.sid, itemId: { in: itemIds }, value: { gt: 0 } };

  const sharerRankings = await prisma.ranking.findMany({
    where: sharerWhere,
    select: { itemId: true, value: true },
  });

  const viewerIsSharer =
    (payload.i.k === "user" && viewer?.id === payload.i.id) ||
    (payload.i.k === "anon" && anonSession === payload.i.sid);

  let vsSharer: { within: number; both: number } | null = null;
  if (!viewerIsSharer && sharerRankings.length > 0) {
    const viewerMap = new Map(viewerRankings.map((r) => [r.itemId, r.value]));
    const sharerMap = new Map(sharerRankings.map((r) => [r.itemId, r.value]));
    const { within, both } = scoreRankerPair(viewerMap, sharerMap);
    vsSharer = { within, both };
  }

  const sharerHandle =
    payload.i.k === "user"
      ? list.createdBy.display_name ?? list.createdBy.username
      : null;

  return NextResponse.json(
    buildReveal({ payoff, vsSharer, sharerHandle })
  );
}
```

Note: a `user`-identity sharer's handle is only the list creator when the sharer *is* the creator. For non-creator authed sharers, fetch the username via `prisma.user.findUnique({ where: { id: payload.i.id }, select: { username: true, display_name: true } })`. Add that lookup if `payload.i.k === "user"` and the id differs from `list.createdById` (select `createdById` too). Keep anon sharers handle-less.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint app/api/c/[ref]/reveal/route.ts`
Expected: no errors. (Use a typed `prisma.user`/`prisma.list` call; avoid `as any` to keep lint clean, per the convention in `app/api/og/verdict/route.ts`.)

- [ ] **Step 3: Commit**

```bash
git add app/api/c/[ref]/reveal/route.ts
git commit -m "feat: challenge reveal API (vs sharer + vs crowd)"
```

---

## Task 3: Mint `/c/` share links

**Files:**
- Modify: `app/api/r/[token]/share-ref/route.ts`

- [ ] **Step 1: Change the returned URL**

Find:
```ts
  const ref = signVerdictRef({ l: list.id, i: identity, t: template });
  return NextResponse.json({ url: `/r/${token}/v/${ref}` });
```
Replace with:
```ts
  const ref = signVerdictRef({ l: list.id, i: identity, t: template });
  // Canonical share link is the challenge route: it unfurls as the verdict
  // card (reuses /api/og/verdict) and clicking opens the blind-compare flow.
  return NextResponse.json({ url: `/c/${ref}` });
```

- [ ] **Step 2: Verify PayoffPage consumes `url` verbatim**

Read `app/components/payoff/index.tsx` — the `shareVerdictLink` handler builds `absolute = window.location.origin + url`. No change needed; it uses whatever `url` the route returns.

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit -p tsconfig.json`
```bash
git add app/api/r/[token]/share-ref/route.ts
git commit -m "feat: mint /c challenge links from share-ref"
```

---

## Task 4: `/c/[ref]` route — server page

**Files:**
- Create: `app/(pages)/c/[ref]/page.tsx`

Model `generateMetadata` on `app/(pages)/r/[token]/v/[ref]/page.tsx` (verdict OG + `noindex`), but resolve by ref instead of token.

- [ ] **Step 1: Write the server page**

```tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, TWITTER_HANDLE } from "@/app/siteConfig";
import { verifyVerdictRef } from "@/lib/share/verdictRef";
import ChallengeClient from "./ChallengeClient";

type Props = { params: Promise<{ ref: string }> };

const noindex = { robots: { index: false, follow: false } } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ref } = await params;
  const payload = verifyVerdictRef(ref);
  if (!payload) return { title: SITE_NAME, ...noindex };

  const list = await prisma.list.findUnique({
    where: { id: payload.l },
    select: { title: true, visibility: true, is_shareable: true },
  });
  if (!list || list.visibility !== "public" || !list.is_shareable) {
    return { title: SITE_NAME, ...noindex };
  }

  const title = `${list.title} — ${SITE_NAME}`;
  const description = `Rank ${list.title} blind, then see how you compare on ${SITE_NAME}.`;
  const ogImage = `/api/og/verdict?ref=${encodeURIComponent(ref)}`;

  return {
    title,
    description,
    ...noindex,
    openGraph: { title, description, type: "website", images: [{ url: ogImage, width: 1200, height: 675 }] },
    twitter: { card: "summary_large_image", title, description, site: TWITTER_HANDLE, images: [ogImage] },
  };
}

export default async function ChallengePage({ params }: Props) {
  const { ref } = await params;
  const payload = verifyVerdictRef(ref);

  if (!payload) {
    return <ChallengeClient invalid token={null} ref_={ref} listTitle={null} sharerHandle={null} />;
  }

  const list = await prisma.list.findUnique({
    where: { id: payload.l },
    select: {
      title: true,
      visibility: true,
      is_shareable: true,
      share_token: true,
      createdById: true,
      createdBy: { select: { username: true, display_name: true } },
    },
  });

  if (!list || list.visibility !== "public" || !list.is_shareable || !list.share_token) {
    return <ChallengeClient invalid token={null} ref_={ref} listTitle={null} sharerHandle={null} />;
  }

  let sharerHandle: string | null = null;
  if (payload.i.k === "user") {
    if (payload.i.id === list.createdById) {
      sharerHandle = list.createdBy.display_name ?? list.createdBy.username;
    } else {
      const u = await prisma.user.findUnique({
        where: { id: payload.i.id },
        select: { username: true, display_name: true },
      });
      sharerHandle = u ? (u.display_name ?? u.username) : null;
    }
  }

  return (
    <ChallengeClient
      invalid={false}
      token={list.share_token}
      ref_={ref}
      listTitle={list.title}
      sharerHandle={sharerHandle}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: fails only because `./ChallengeClient` does not exist yet — create it in Task 5, then re-run.

- [ ] **Step 3: Commit (after Task 5 compiles)**

Defer the commit until `ChallengeClient` exists (Task 5) so the tree compiles; commit both together there.

---

## Task 5: `/c/[ref]` client — hook vs reveal

**Files:**
- Create: `app/(pages)/c/[ref]/ChallengeClient.tsx`

Decide hook-vs-reveal by whether the viewer already ranked, using `useGetMyRankingQuery(token)` (same hook `/r/[token]/page.tsx` uses: `hasMyRanking = myRanking?.tiers?.some((t) => t.items.length > 0)`). Fetch reveal data from `/api/c/[ref]/reveal`.

- [ ] **Step 1: Write the client component**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGetMyRankingQuery } from "@/lib/api/listsApi";
import { trackEvent } from "@/lib/analytics/client";
import { E } from "@/lib/analytics/events";
import type { RevealData } from "@/lib/server/reveal";

type Props = {
  invalid: boolean;
  token: string | null;
  ref_: string;
  listTitle: string | null;
  sharerHandle: string | null;
};

export default function ChallengeClient({ invalid, token, ref_, listTitle, sharerHandle }: Props) {
  const { data: myRanking } = useGetMyRankingQuery(token ?? "", { skip: !token });
  const hasRanked = !!myRanking?.tiers?.some((t) => t.items.length > 0);
  const [reveal, setReveal] = useState<RevealData | null>(null);

  useEffect(() => {
    if (!invalid && token) trackEvent(E.CHALLENGE_OPENED, { ref: ref_ });
  }, [invalid, token, ref_]);

  useEffect(() => {
    if (!hasRanked) return;
    fetch(`/api/c/${ref_}/reveal`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setReveal(d))
      .catch(() => setReveal(null));
  }, [hasRanked, ref_]);

  if (invalid || !token) {
    return (
      <div className="z-10 bg-rk-page min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-rk-primary text-[17px] font-[500]">This challenge link is no longer valid</p>
        <Link href="/feed" className="mt-2 px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px]">Browse lists</Link>
      </div>
    );
  }

  if (!hasRanked) {
    return (
      <div className="z-10 bg-rk-page min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center max-w-md mx-auto">
        <p className="text-rk-primary text-[22px] font-[500] leading-tight">
          {sharerHandle ? `@${sharerHandle} ranked ${listTitle}.` : `Someone ranked ${listTitle}.`}
        </p>
        <p className="text-rk-secondary text-[14px]">Think you agree? Rank it blind first — then see how you stack up.</p>
        <Link
          href={`/r/${token}/s?ref=${encodeURIComponent(ref_)}`}
          onClick={() => trackEvent(E.CHALLENGE_RANK_STARTED, { ref: ref_ })}
          className="w-full max-w-xs py-2.5 rounded-[10px] text-[14px] font-[500] bg-rk-accent text-white hover:opacity-90 transition-opacity"
        >
          Rank blind
        </Link>
        <button
          onClick={() => { trackEvent(E.CHALLENGE_SKIPPED, { ref: ref_ }); window.location.href = `/r/${token}`; }}
          className="text-[13px] text-rk-muted hover:text-rk-secondary transition-colors cursor-pointer"
        >
          Just show me the results
        </button>
      </div>
    );
  }

  return (
    <div className="z-10 bg-rk-page min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center max-w-md mx-auto">
      <p className="text-rk-secondary text-[13px]">{listTitle}</p>
      {reveal ? (
        <>
          <div className="flex flex-col items-center">
            <span className="text-rk-primary text-[56px] font-[500] leading-none">{reveal.vsCrowdPct}%</span>
            <span className="text-rk-secondary text-[14px] mt-1">aligned with the crowd</span>
          </div>
          {reveal.vsSharerPct !== null && (
            <p className="text-rk-muted text-[14px]">
              vs <span className="text-rk-secondary">@{reveal.sharerHandle}</span>:{" "}
              <span className="text-rk-primary font-[500]">{reveal.vsSharerPct}%</span>
            </p>
          )}
          {reveal.hottestTake && (
            <p className="text-rk-muted text-[13px]">
              Hottest take: <span className="text-rk-primary font-[500]">{reveal.hottestTake.itemName}</span>{" "}
              (you: {reveal.hottestTake.yourTier} · crowd: {reveal.hottestTake.crowdMeanTier})
            </p>
          )}
        </>
      ) : (
        <p className="text-rk-muted text-[14px]">Loading your results…</p>
      )}
      <Link href={`/r/${token}/submitted`} className="w-full max-w-xs py-2.5 rounded-[10px] text-[14px] font-[500] bg-rk-accent text-white hover:opacity-90 transition-opacity">
        See full breakdown
      </Link>
      <Link href="/feed" className="text-[13px] text-rk-muted hover:text-rk-secondary transition-colors">Browse more lists</Link>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "app/(pages)/c/[ref]/page.tsx" "app/(pages)/c/[ref]/ChallengeClient.tsx"`
Expected: no errors. (Confirm `useGetMyRankingQuery` accepts a `{ skip }` option in this RTK Query version; if not, guard by passing a valid token and rely on `hasRanked` staying false.)

- [ ] **Step 3: Commit page + client together**

```bash
git add "app/(pages)/c/[ref]/page.tsx" "app/(pages)/c/[ref]/ChallengeClient.tsx"
git commit -m "feat: /c/[ref] challenge route (hook + reveal)"
```

---

## Task 6: Rank page `?ref=` mode

**Files:**
- Modify: `app/(pages)/r/[token]/s/page.tsx`

- [ ] **Step 1: Read the ref from the URL**

At the top of `AnonRankPage`, alongside `const { token } = useParams<{ token: string }>();`, add:
```tsx
import { useRouter, useParams, useSearchParams } from "next/navigation";
```
and inside the component:
```tsx
  const searchParams = useSearchParams();
  const challengeRef = searchParams.get("ref");
```

- [ ] **Step 2: Redirect to `/c/[ref]` on submit when in challenge mode**

Find (around line 147):
```tsx
      router.push(`/r/${token}/submitted${isFirstSubmit ? "?first=1" : ""}`);
```
Replace with:
```tsx
      if (challengeRef) {
        router.push(`/c/${challengeRef}`);
      } else {
        router.push(`/r/${token}/submitted${isFirstSubmit ? "?first=1" : ""}`);
      }
```

- [ ] **Step 3: Show a challenge banner**

Immediately inside the top-level returned container (the loaded state's outermost `div`), add a banner that only renders when `challengeRef` is present:
```tsx
      {challengeRef && (
        <div className="px-4 sm:px-8 py-2 text-center text-[13px] text-rk-secondary border-b border-rk-stroke" style={{ backgroundColor: "rgba(74,138,232,0.08)" }}>
          You&apos;re taking a challenge — rank blind, then see how you compare.
        </div>
      )}
```
Place it as the first child of the loaded-state wrapper so it sits above the tier UI. (`useSearchParams` requires the component tree to be within a Suspense boundary; this page is a client route segment so it already renders client-side — if the build complains about `useSearchParams`, wrap the page export in `<Suspense>` per the pattern in `app/(pages)/s/[id]/ListDetail.tsx`'s `InviteParamReader`.)

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "app/(pages)/r/[token]/s/page.tsx"`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(pages)/r/[token]/s/page.tsx"
git commit -m "feat: challenge mode on rank page (banner + /c redirect)"
```

---

## Task 7: Analytics events

**Files:**
- Modify: `lib/analytics/events.ts`

- [ ] **Step 1: Add event constants**

Read `lib/analytics/events.ts` to match its style (it exports an `E` map). Add:
```ts
  CHALLENGE_OPENED: "challenge_opened",
  CHALLENGE_RANK_STARTED: "challenge_rank_started",
  CHALLENGE_SKIPPED: "challenge_skipped",
```
(`challenge_submitted` is already captured by the existing rank-submit + the reveal load; add it only if the team wants an explicit event — if so, fire `CHALLENGE_SUBMITTED` from the reveal `useEffect` in `ChallengeClient` when `reveal` first loads.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (the `E.CHALLENGE_*` references in `ChallengeClient` now resolve).

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/events.ts
git commit -m "feat: challenge funnel analytics events"
```

---

## Task 8: Full verification

- [ ] **Step 1: Whole suite + types + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
npx eslint "app/(pages)/c/[ref]/page.tsx" "app/(pages)/c/[ref]/ChallengeClient.tsx" "app/api/c/[ref]/reveal/route.ts" lib/server/reveal.ts "app/(pages)/r/[token]/s/page.tsx" app/api/r/[token]/share-ref/route.ts
```
Expected: tsc clean; all tests pass; no new lint errors.

- [ ] **Step 2: Manual / staging checklist**

- Open a `/c/[ref]` link as a fresh visitor → hook screen with sharer handle.
- "Rank blind" → rank page shows the challenge banner; submit → lands on `/c/[ref]` reveal with crowd % + vs-sharer %.
- "Just show me the results" → `/r/[token]` spoiler view; fires `challenge_skipped`.
- Anon viewer end-to-end (no auth cookie).
- Sharer opens their own `/c/[ref]` → vs-sharer line hidden.
- Sharer with no rankings (cleared anon session) → reveal shows crowd-only.
- Tampered ref → invalid-link screen; `/api/c/[ref]/reveal` returns 404.
- Paste a `/c/` link into the Facebook debugger / Slack → unfurls as the verdict card.

---

## Notes

- All ranking/submit/anon-session logic is reused from `/r/[token]/s` — do not reimplement it.
- `computePayoff` and `scoreRankerPair` are the source of truth for the numbers; the only new math is `buildReveal` (Task 1).
- Keep Prisma calls typed (cast results through `as unknown as { … }` if needed) rather than `prisma.x as any`, to avoid adding lint debt.
