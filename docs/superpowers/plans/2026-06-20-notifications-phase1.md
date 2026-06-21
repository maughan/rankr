# In-app Notifications (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A personal "what happened to you" notifications inbox + unread bell, fed by a single `notify()` helper from existing trigger sites.

**Architecture:** A dedicated `Notification` table (read state + aggregation). A pure `notificationCopy` formats each row. A `notify()` server helper is the only writer (self-skip, block-aware, upsert-aggregation for high-volume types). Triggers: the rankings route (ranked/hot-take/milestone), the follow route, and the taste cron (twin change). A bell in `NavAvatar` (global) opens the inbox; `GET /api/notifications` + `POST /api/notifications/seen` back it.

**Tech Stack:** Next.js 16, React 19, Prisma/Postgres, RTK Query, vitest.

**Environment note:** the build sandbox is resource-limited late in the session — `tsc`/`vitest` may time out / OOM there. Each task: run `npx eslint <files>` (lighter); attempt the relevant single vitest file for TDD tasks, but if it OOMs, implement carefully and note that full `tsc`/`vitest` must be confirmed on the host. Use `(prisma.x as any)` for new columns/models the stale generated client doesn't know yet.

---

## File Structure

- Modify `prisma/schema.prisma` — `Notification` model + `NotificationType` enum + back-relations on `User`/`List`.
- Create `prisma/migrations/<ts>_notifications/migration.sql`.
- Create `lib/notificationCopy.ts` + `__tests__/notificationCopy.test.ts`.
- Create `lib/server/notify.ts` — the fan-out helper.
- Modify `app/api/rankings/route.ts`, `app/api/u/[username]/follow/route.ts`, `app/api/cron/taste-matches/route.ts` — call `notify()`.
- Create `app/api/notifications/route.ts` (GET) + `app/api/notifications/seen/route.ts` (POST).
- Create `lib/api/notificationsApi.ts` (RTK) + a `NotificationBell` component; wire into `NavAvatar`.
- Light touch-up of the feed "new" markers.

---

## Task 1: Schema + `notificationCopy` (TDD)

**Files:**
- Modify `prisma/schema.prisma`; Create `prisma/migrations/20260620000003_notifications/migration.sql`
- Create `lib/notificationCopy.ts`; Test `__tests__/notificationCopy.test.ts`

- [ ] **Step 1: Schema.** Add the enum + model from the spec (`NotificationType`, `Notification`) and back-relations: on `User` add `notifications_received Notification[] @relation("NotificationsReceived")` and `notifications_acted Notification[] @relation("NotificationsActed")`; on `List` add `notifications Notification[]`. Run `npx prisma generate` (note if it can't run in-sandbox).

- [ ] **Step 2: Migration** `prisma/migrations/20260620000003_notifications/migration.sql`:
```sql
CREATE TYPE "NotificationType" AS ENUM ('ranked_your_list','new_follower','new_taste_twin','list_milestone','hot_take');

CREATE TABLE "Notification" (
  "id" SERIAL PRIMARY KEY,
  "recipientId" INTEGER NOT NULL,
  "type" "NotificationType" NOT NULL,
  "actorId" INTEGER,
  "listId" INTEGER,
  "itemId" INTEGER,
  "count" INTEGER NOT NULL DEFAULT 1,
  "meta" JSONB,
  "read_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "Notification_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE
);
CREATE INDEX "Notification_recipientId_read_at_idx" ON "Notification"("recipientId","read_at");
CREATE INDEX "Notification_recipientId_updatedAt_idx" ON "Notification"("recipientId","updatedAt" DESC);
```

- [ ] **Step 3: Write failing test** `__tests__/notificationCopy.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { notificationCopy, NotificationView } from "@/lib/notificationCopy";

const base: NotificationView = {
  id: 1, type: "ranked_your_list", count: 1,
  actorName: "Alice", actorUsername: "alice",
  listTitle: "Chocolate bars", listHref: "/s/chocolate-bars-aB12cD34",
  meta: {},
};

describe("notificationCopy", () => {
  it("ranked_your_list, single actor", () => {
    const r = notificationCopy(base);
    expect(r.text).toBe("Alice ranked Chocolate bars");
    expect(r.href).toBe("/s/chocolate-bars-aB12cD34");
  });
  it("ranked_your_list aggregates with +N others", () => {
    expect(notificationCopy({ ...base, count: 7 }).text).toBe("Alice and 6 others ranked Chocolate bars");
  });
  it("null actor renders 'Someone'", () => {
    expect(notificationCopy({ ...base, actorName: null, actorUsername: null }).text).toBe("Someone ranked Chocolate bars");
  });
  it("new_follower links to the profile", () => {
    const r = notificationCopy({ ...base, type: "new_follower", listTitle: null, listHref: null });
    expect(r.text).toBe("Alice followed you");
    expect(r.href).toBe("/u/alice");
  });
  it("new_taste_twin shows pct", () => {
    const r = notificationCopy({ ...base, type: "new_taste_twin", meta: { twinPct: 87 } });
    expect(r.text).toBe("You have a new taste twin: @alice (87%)");
    expect(r.href).toBe("/u/alice");
  });
  it("list_milestone", () => {
    const r = notificationCopy({ ...base, type: "list_milestone", meta: { milestone: 50 } });
    expect(r.text).toBe("Chocolate bars hit 50 rankers");
  });
  it("hot_take", () => {
    expect(notificationCopy({ ...base, type: "hot_take" }).text).toBe("A divisive take landed on Chocolate bars");
  });
});
```

- [ ] **Step 4: Run, confirm fail.** `npx vitest run __tests__/notificationCopy.test.ts` (if vitest OOMs/times out, note it; implement from the test as the spec).

- [ ] **Step 5: Implement** `lib/notificationCopy.ts`:
```ts
export type NotificationType =
  | "ranked_your_list" | "new_follower" | "new_taste_twin" | "list_milestone" | "hot_take";

export interface NotificationView {
  id: number;
  type: NotificationType;
  count: number;
  actorName: string | null;
  actorUsername: string | null;
  listTitle: string | null;
  listHref: string | null;
  meta: Record<string, unknown>;
}

function actorLabel(v: NotificationView): string {
  const name = v.actorName ?? "Someone";
  if (v.count > 1) return `${name} and ${v.count - 1} other${v.count - 1 === 1 ? "" : "s"}`;
  return name;
}

export function notificationCopy(v: NotificationView): { text: string; href: string } {
  const profileHref = v.actorUsername ? `/u/${v.actorUsername}` : "/feed";
  const listHref = v.listHref ?? "/feed";
  const title = v.listTitle ?? "a list";
  switch (v.type) {
    case "ranked_your_list":
      return { text: `${actorLabel(v)} ranked ${title}`, href: listHref };
    case "hot_take":
      return { text: `A divisive take landed on ${title}`, href: listHref };
    case "list_milestone":
      return { text: `${title} hit ${Number(v.meta.milestone ?? 0)} rankers`, href: listHref };
    case "new_follower":
      return { text: `${v.actorName ?? "Someone"} followed you`, href: profileHref };
    case "new_taste_twin":
      return {
        text: `You have a new taste twin: @${v.actorUsername ?? "someone"} (${Number(v.meta.twinPct ?? 0)}%)`,
        href: profileHref,
      };
  }
}
```

- [ ] **Step 6: Run, confirm pass; eslint; commit.**
```bash
git add prisma/schema.prisma prisma/migrations/20260620000003_notifications lib/notificationCopy.ts __tests__/notificationCopy.test.ts
git commit -m "feat: notification schema + copy builder (TDD)"
```

---

## Task 2: `notify()` fan-out helper

**Files:** Create `lib/server/notify.ts`

Read `lib/server/payoff.ts` / an existing block lookup for the block-check pattern.

- [ ] **Step 1: Implement** (use `(prisma as any)` for the `notification` model — stale client):
```ts
import { prisma } from "@/lib/prisma";

type NotifyArgs = {
  recipientId: number;
  type: "ranked_your_list" | "new_follower" | "new_taste_twin" | "list_milestone" | "hot_take";
  actorId?: number | null;
  listId?: number | null;
  itemId?: number | null;
  meta?: Record<string, unknown>;
};

const AGGREGATING = new Set(["ranked_your_list", "hot_take"]);

export async function notify(a: NotifyArgs): Promise<void> {
  try {
    if (a.actorId && a.actorId === a.recipientId) return; // never self-notify

    if (a.actorId) {
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: a.recipientId, blockedId: a.actorId },
            { blockerId: a.actorId, blockedId: a.recipientId },
          ],
        },
        select: { blockerId: true },
      });
      if (block) return;
    }

    const db = prisma as any;

    if (AGGREGATING.has(a.type) && a.listId != null) {
      const existing = await db.notification.findFirst({
        where: { recipientId: a.recipientId, type: a.type, listId: a.listId, read_at: null },
        select: { id: true, count: true },
      });
      if (existing) {
        await db.notification.update({
          where: { id: existing.id },
          data: { count: existing.count + 1, actorId: a.actorId ?? null, meta: a.meta ?? undefined, updatedAt: new Date() },
        });
        return;
      }
    }

    // list_milestone dedupe: one per (recipient, list, milestone)
    if (a.type === "list_milestone" && a.listId != null) {
      const ms = (a.meta?.milestone as number) ?? null;
      if (ms != null) {
        const dupe = await db.notification.findFirst({
          where: { recipientId: a.recipientId, type: "list_milestone", listId: a.listId },
          select: { id: true, meta: true },
        });
        if (dupe && (dupe.meta?.milestone ?? null) === ms) return;
      }
    }

    await db.notification.create({
      data: {
        recipientId: a.recipientId,
        type: a.type,
        actorId: a.actorId ?? null,
        listId: a.listId ?? null,
        itemId: a.itemId ?? null,
        meta: a.meta ?? undefined,
      },
    });
  } catch (err) {
    console.error("notify failed", err); // never block the triggering action
  }
}
```

- [ ] **Step 2: eslint + commit.**
```bash
git add lib/server/notify.ts
git commit -m "feat: notify() fan-out helper"
```

---

## Task 3: Wire triggers

**Files:** `app/api/rankings/route.ts`, `app/api/u/[username]/follow/route.ts`, `app/api/cron/taste-matches/route.ts`

Read each file first.

- [ ] **Step 1: rankings route.** It already loads the list (with `createdById`) and emits `ranked`/`hot_take`/`milestone` ActivityEvents. After those succeed, call `notify` for the **list owner** (skip when owner is the ranker — `notify` self-skips anyway):
  - after the `ranked` event: `await notify({ recipientId: creatorId, type: "ranked_your_list", actorId: viewer.id, listId, meta: { lastActorName: <ranker display/username or null> } });` (compute `creatorId` from the loaded list; it already reads `list.createdById` in the milestone block).
  - after the `hot_take` event: `notify({ recipientId: creatorId, type: "hot_take", actorId: viewer.id, listId })`.
  - in the milestone block (where it computes the crossed threshold): `notify({ recipientId: creatorId, type: "list_milestone", listId, meta: { milestone: <threshold> } })`.
  - Anon rankers: `viewer` may be anon — if there's no authed user id, pass `actorId: null` (renders "Someone") but still notify the owner. Match how the route distinguishes authed vs anon.

- [ ] **Step 2: follow route.** In the POST (after `tx.follow.create` commits), `await notify({ recipientId: target.id, type: "new_follower", actorId: viewer.sub })`.

- [ ] **Step 3: taste cron.** Before overwriting `taste_matches`, read the user's previous `taste_matches.twin?.userId`. After computing the new value, if the new `twin?.userId` exists and differs from the previous, `await notify({ recipientId: id, type: "new_taste_twin", actorId: newTwin.userId, meta: { twinPct: newTwin.pct } })`.

- [ ] **Step 4: eslint + commit.**
```bash
git add app/api/rankings/route.ts "app/api/u/[username]/follow/route.ts" "app/api/cron/taste-matches/route.ts"
git commit -m "feat: emit notifications from rank/follow/taste triggers"
```

---

## Task 4: Notifications API

**Files:** Create `app/api/notifications/route.ts`, `app/api/notifications/seen/route.ts`

- [ ] **Step 1: GET** `app/api/notifications/route.ts` — `getAuthedViewer` (401 if none); return the recipient's notifications ordered by `updatedAt desc` (cursor paginate, page ~20), joining actor (`username`, `display_name`) + list (`title`, `slug`, `short_id`) so the client can build copy/hrefs; also return `unread_count` (`count where read_at is null`). Use `(prisma as any).notification`. Shape each row into a `NotificationView`-compatible payload plus `read` boolean + `createdAt`.

- [ ] **Step 2: POST** `app/api/notifications/seen/route.ts` — `getAuthedViewer`; body `{ ids?: number[] }`; `updateMany` set `read_at = now()` where `recipientId = viewer.id` and (`id in ids` if provided, else `read_at is null`). Return `{ ok: true }`.

- [ ] **Step 3: eslint + commit.**
```bash
git add app/api/notifications
git commit -m "feat: notifications API (list + unread + mark seen)"
```

---

## Task 5: Bell + inbox UI

**Files:** Create `lib/api/notificationsApi.ts` (RTK, injected like `profileApi`), `app/components/NotificationBell.tsx`; modify `app/components/NavAvatar.tsx`.

Read `lib/api/profileApi.ts` (RTK inject pattern), `app/components/NavAvatar.tsx`, and how `lib/notificationCopy.ts` is used.

- [ ] **Step 1: RTK api** — `getNotifications` query (returns `{ items, unread_count }`) and `markSeen` mutation (invalidates the query). Tag-based invalidation.

- [ ] **Step 2: `NotificationBell`** — a bell icon (lucide `Bell`) with an unread badge (`unread_count`, capped "9+"). Click opens a dropdown panel listing items: each uses `notificationCopy(view)` for text + href, shows actor avatar/relative time (`date-fns` `formatDistanceStrict`, already used in feed), an unread dot, and on click calls `markSeen({ ids: [id] })` then navigates to `href`. A "Mark all read" action calls `markSeen({})`. Empty state. Match existing nav/panel styling.

- [ ] **Step 3: Wire into `NavAvatar`** — render `<NotificationBell/>` beside the avatar so it appears on every authed page that uses `NavAvatar`. Only render for signed-in users (NavAvatar already implies that).

- [ ] **Step 4: eslint + commit.**
```bash
git add lib/api/notificationsApi.ts app/components/NotificationBell.tsx app/components/NavAvatar.tsx
git commit -m "feat: notification bell + inbox"
```

---

## Task 6: Feed markers touch-up + verification + final review

**Files:** the feed page (light) + verification.

- [ ] **Step 1: Feed "new" markers.** The feed already computes new-since-`last_feed_visit_at`. Ensure new items are visually marked (a small "new" dot/label) if not already obvious. Do NOT restructure the feed. (Skip if already clearly marked — report.)

- [ ] **Step 2: Verify** (on the host if the sandbox OOMs):
```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
npx eslint lib/notificationCopy.ts __tests__/notificationCopy.test.ts lib/server/notify.ts app/api/notifications/route.ts app/api/notifications/seen/route.ts app/api/rankings/route.ts lib/api/notificationsApi.ts app/components/NotificationBell.tsx
```
Expected: tsc clean; tests pass (incl. `notificationCopy`); no new lint beyond `as any`.

- [ ] **Step 3: Final review subagent** — focus: `notify()` never throws into the triggering request; self-notify + block suppression; aggregation upsert correctness (no unbounded rows); API auth (recipient-scoped, no cross-user read); mark-seen only affects the caller's rows.

- [ ] **Step 4: Manual / staging checklist**
- Apply migration `20260620000003_notifications`.
- Rank someone else's list → owner gets one aggregating notification + badge; rank again from another account → count bumps, still one row.
- Follow someone → they get a notification; self-actions never notify; blocked users don't notify.
- Mark-all-read clears the badge; clicking an item marks it read + deep-links.
- Cron twin change → "new taste twin" notification (only when the twin actually changes).

---

## Notes

- Migration `20260620000003_notifications` applied by the human (`prisma migrate deploy`); plan only runs `prisma generate`.
- `notify()` is the single writer — triggers never touch the table directly.
- Push (Phase 2) will fan out from `notify()`; keep it the choke point.
- Only new pure logic is `notificationCopy` (Task 1, tested); everything else is wiring + UI.
