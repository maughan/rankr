# In-app notifications (Phase 1) — design

## Goal

Give signed-in users a personal "what happened to you" inbox with an unread
bell, so activity on their lists and taste graph pulls them back. In-app only
this phase; web push is Phase 2 (its own spec, fans out from this).

## Decisions (locked)

- Dedicated `Notification` table (approach A), with read state + aggregation.
- Events: someone ranked your list, new follower, new taste twin, list
  milestone, hot take on your list.
- Surface: a nav **bell + unread badge** and a **notifications inbox**, plus a
  light touch-up of the feed's existing "new" markers.
- Aggregation so a popular list doesn't spam one row per ranker.

## Data model

Prisma migration:

```prisma
enum NotificationType {
  ranked_your_list
  new_follower
  new_taste_twin
  list_milestone
  hot_take
}

model Notification {
  id          Int              @id @default(autoincrement())
  recipientId Int
  type        NotificationType
  actorId     Int?             // the user who triggered it (null for system/taste)
  listId      Int?
  itemId      Int?
  count       Int              @default(1)   // aggregated actor count
  meta        Json?            // e.g. { milestone: 50, twinPct: 87, lastActorName }
  read_at     DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @default(now()) @updatedAt

  recipient User  @relation("NotificationsReceived", fields: [recipientId], references: [id], onDelete: Cascade)
  actor     User? @relation("NotificationsActed",   fields: [actorId],     references: [id], onDelete: SetNull)
  list      List? @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@index([recipientId, read_at])
  @@index([recipientId, updatedAt(sort: Desc)])
}
```

Add the back-relations on `User` (`notifications_received`, `notifications_acted`)
and `List` (`notifications`). Unread count = rows where `read_at is null`.

## Emit / fan-out — `lib/server/notify.ts`

A single server helper is the only writer:

```ts
notify({ recipientId, type, actorId?, listId?, itemId?, meta? }): Promise<void>
```

Rules:
- **Never notify your own action** (`actorId === recipientId` → no-op).
- Respect blocks: skip if recipient and actor block each other (reuse the
  existing block lookup).
- **Aggregating types** (`ranked_your_list`, `hot_take`): upsert one row per
  `(recipientId, type, listId)` — if an unread row exists, bump `count`,
  refresh `actorId`/`meta.lastActorName`/`updatedAt`; if none (or the last was
  read), create fresh. So "Alice + 6 others ranked your list" is one row.
- **Discrete types** (`new_follower`, `new_taste_twin`, `list_milestone`):
  create a row (milestone deduped per `(recipient, list, meta.milestone)` so a
  threshold fires once).
- Failures are swallowed (never block the triggering action).

Trigger sites (call `notify()` after the primary write succeeds):
- **Ranked your list** — the rank submit path (`/api/rankings` and/or
  `/api/r/[token]/rank`): notify the list owner, actor = the ranker. Skip anon
  rankers as actor (no profile) — still aggregate count, `meta.lastActorName`
  null → render "Someone".
- **Hot take** — where the `hot_take` `ActivityEvent` is emitted: notify the
  owner.
- **List milestone** — where the `milestone` `ActivityEvent` is emitted: notify
  the owner with `meta.milestone`.
- **New follower** — the follow route: notify the followed user.
- **New taste twin** — the nightly `taste-matches` cron: when a user's
  `taste_matches.twin` changes to a *new* user id vs the previous run, notify
  with `meta.twinPct`.

## API

- `GET /api/notifications?cursor=` — the recipient's notifications, newest
  `updatedAt` first, paginated; plus `unread_count`. Auth required.
- `POST /api/notifications/seen` — mark all (or `{ ids }`) read (`read_at = now`).
- Both guard via `getAuthedViewer`; 401 when signed out.

## UI

- **Bell** in the app nav (the authed nav that already shows `NavAvatar`): a bell
  icon with an unread-count badge. Polls `unread_count` on mount / nav (reuse the
  existing query patterns; no realtime this phase).
- **Inbox**: a panel/dropdown from the bell (and/or a `/notifications` page)
  listing notifications — each rendered by a copy builder (see below) with the
  actor avatar/list, relative time, unread dot; clicking marks it read and
  deep-links (to the list `/s/...`, or the actor's profile for a follow).
  "Mark all read" action.
- **Feed "new" markers**: the feed already computes "new since
  `last_feed_visit_at`" — light touch-up only (ensure the new items are visually
  marked); no structural change.

## Copy builder — `lib/notificationCopy.ts` (pure, tested)

`notificationCopy(n): { text: string; href: string }` maps a notification to
display text + link, e.g.:
- `ranked_your_list` → `"{actor}{+N others} ranked {listTitle}"`, href list.
- `new_follower` → `"{actor} followed you"`, href profile.
- `new_taste_twin` → `"You have a new taste twin: @{actor} ({pct}%)"`, href profile.
- `list_milestone` → `"{listTitle} hit {milestone} rankers"`, href list.
- `hot_take` → `"A divisive take landed on {listTitle}"`, href list.
Pure formatting (count → "and N others", null actor → "Someone") — unit-tested.

## Privacy / safety

- Only signed-in users receive notifications; anon actions notify the owner but
  the anon actor renders as "Someone" (no profile link).
- Blocks suppress notifications both ways.
- A private-profile actor still generates the notification (it's about the
  recipient's own list/graph); the deep link respects the existing private-profile
  gating when followed.
- `notify()` never throws into the triggering request.

## Testing

- Unit (`lib/notificationCopy.ts`): each type's text + href, the "+N others"
  pluralisation, null-actor "Someone".
- Unit: the aggregation decision (a small pure helper deciding upsert-vs-create
  given an existing unread row) if extracted; otherwise covered by integration.
- Integration/staging: rank someone's list → owner sees one aggregating
  notification + badge; follow → notification; cron twin change → notification;
  mark-read clears the badge; self-actions never notify; blocked users don't
  notify.

## Out of scope (Phase 2 / later)

- Web push (service worker, VAPID, subscriptions) — separate spec, fans out from
  `notify()`.
- Email digests.
- Realtime/websocket delivery (polling is fine this phase).
- Per-type notification preferences/muting (add later).
