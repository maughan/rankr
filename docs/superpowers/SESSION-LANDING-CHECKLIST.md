# Session landing + QA checklist

Everything below was built in one working session and is **uncommitted** (a stale
`.git/index.lock` blocked commits from the tooling). Code is tsc-clean,
lint-clean (beyond the repo's pre-existing `as any` convention), and the test
suite passes (193 tests). None of it has run against a real DB or browser yet.

## 0. First: clear the lock

```bash
rm -f "/Users/rhysmaughan/Desktop/Development/rankr/.git/index.lock"
```

## Git state — read this before committing

The working tree already contained an **in-progress route-group refactor that
predates this session** (moving routes under `app/(pages)/…`). Because of that
move, large parts of `app/(pages)/` show as *untracked*, and these files were
modified by someone else, **not this session**:

- `app/page.tsx`, `app/components/FooterWrapper.tsx`, `app/components/index.tsx`,
  `app/siteConfig.ts`, and the bulk of the `app/(pages)/` tree
  (`admin/`, `browse/`, `login/`, `onboarding/`, `library/`, `signup/`,
  `tier-list-maker/`, most `landing/*`).

Decide how to land that refactor (likely its own commit) separately. The
per-feature file lists below are the **session's** work only.

---

## Features built this session (commit groups)

### Already committed earlier this session
- `6483698 feat: personal verdict share links, /s/ SSR, and SEO fixes` — the
  first feature batch landed before the lock appeared. Some of its files were
  touched again later (e.g. the `is_shareable` fix on `/api/og/verdict`), so
  they reappear as modified below.

### A — Blind-compare challenge flow (`/c/[ref]`)
```
git add lib/server/reveal.ts __tests__/reveal.test.ts \
  "app/api/c/[ref]/reveal/route.ts" \
  "app/(pages)/c/[ref]/page.tsx" "app/(pages)/c/[ref]/ChallengeClient.tsx" \
  "app/(pages)/r/[token]/s/page.tsx" \
  app/api/r/[token]/share-ref/route.ts \
  lib/analytics/events.ts middleware.ts \
  app/components/payoff/index.tsx
git commit -m "feat: blind-compare challenge flow (/c/[ref])"
```
(`payoff/index.tsx` also carries the verdict-link share button + later the taste
twin — it spans features; commit it once with whichever group you land first.)

### B — Persistent taste identity (Phase 1)
```
git add prisma/schema.prisma lib/insightsConfig.ts \
  lib/server/tasteMatch.ts __tests__/tasteMatch.test.ts \
  "app/api/cron/taste-matches/route.ts" vercel.json \
  lib/server/profileData.ts lib/api/profileApi.ts \
  "app/(pages)/u/[username]/ProfileClient.tsx" "app/(pages)/u/[username]/page.tsx" \
  lib/server/resolveProfile.ts \
  app/api/user/update/route.ts app/api/user/me/route.ts \
  "app/(pages)/settings/profile/page.tsx" \
  prisma/migrations/20260620000001_taste_identity/
git commit -m "feat: persistent taste identity + private profiles (phase 1)"
```

### C — Taste discovery (Phase 2)
```
git add app/api/feed/discover/route.ts lib/api/feedApi.ts \
  "app/(pages)/feed/page.tsx" \
  lib/server/payoff.ts lib/api/listsApi.ts
# (payoff/index.tsx twin card lands with whichever group includes it)
git commit -m "feat: rank-like-you discovery + payoff taste twin (phase 2)"
```

### D — Consensus + per-item distribution
```
git add lib/itemDistribution.ts __tests__/itemDistribution.test.ts \
  app/components/item/ItemDistribution.tsx app/components/item/ItemCard.tsx \
  lib/server/aggregation.ts \
  "app/(pages)/s/[id]/ListDetail.tsx" "app/(pages)/r/[token]/page.tsx"
git commit -m "feat: consensus + per-item distribution"
```

### E — Start-from-template gallery
```
git add prisma/schema.prisma prisma/migrations/20260620000002_is_template \
  lib/listUrl.ts __tests__/cloneTitle.test.ts \
  "app/api/s/[id]/copy/route.ts" app/api/templates/route.ts \
  "app/(pages)/templates" \
  app/api/admin/lists "app/(pages)/admin/lists/page.tsx" "app/(pages)/admin/page.tsx" \
  "app/(pages)/feed/page.tsx"
git commit -m "feat: start-from-template gallery + admin curation"
```
Second migration to apply: `20260620000002_is_template` (after the taste one).

### F — In-app notifications (Phase 1)
```
git add prisma/schema.prisma prisma/migrations/20260620000003_notifications \
  lib/notificationCopy.ts __tests__/notificationCopy.test.ts \
  lib/server/notify.ts \
  app/api/rankings/route.ts "app/api/u/[username]/follow/route.ts" "app/api/cron/taste-matches/route.ts" \
  app/api/notifications \
  lib/api/notificationsApi.ts lib/api/baseApi.ts \
  app/components/NotificationBell.tsx app/components/NavAvatar.tsx
git commit -m "feat: in-app notifications (phase 1)"
```
Third migration to apply: `20260620000003_notifications`.
Known: the new route files use bare `(prisma as any)` casts (lint `any` debt, same as the rest of the codebase — clean up in the batch `any` pass; add `// eslint-disable-next-line` if your build hard-fails on lint). Web push = Phase 2 (fans out from `notify()`).

### G — Discovery-first feed redesign (no migration)
```
git add lib/server/feedCards.ts __tests__/feedCards.test.ts \
  app/api/feed/discover-lists/route.ts app/api/feed/route.ts lib/api/feedApi.ts \
  "app/components/feed/GeneratedCover.tsx" "app/components/feed/RichListCard.tsx" \
  "app/(pages)/feed/page.tsx"
git commit -m "feat: discovery-first feed redesign"
```
No migration. Rich cards (generated cover, tier strip, divisiveness, twin hook), made-for-you + trending sections, network align%, people-who-rank-like-you.
Follow-up (not blocking): the feed "new posts" poll re-runs full page-1 assembly every 60s — add a lightweight latest-network-id check endpoint when convenient.

> Note: several files (`payoff/index.tsx`, `listsApi.ts`, `lib/insightsConfig.ts`,
> `ListDetail.tsx`, `/r/[token]/page.tsx`) span more than one feature — git
> tracks files, not features, so each lands with the first commit that includes
> it. If you'd rather not untangle, a single `git add -A && git commit` of the
> session's work (after handling the pre-existing refactor) is perfectly fine.

Also commit the design docs/specs/plans: `docs/superpowers/`.

---

## 1. Prisma — required before anything taste-related runs

`prisma generate` couldn't run in the build sandbox (engine binary is
macOS-only there), so the generated client doesn't yet know the two new `User`
columns. On your Mac:

```bash
npx prisma generate                       # regenerate client w/ taste_matches, profile_private, is_template
npx prisma migrate deploy                 # apply 20260620000001_taste_identity + 20260620000002_is_template
# (or: npx prisma migrate dev if you prefer dev flow)
```

After `prisma generate`, the many `(prisma.user as any)` casts on `taste_matches`
/ `profile_private` become unnecessary (harmless to leave) — they exist only so
tsc passed against the stale in-sandbox client.

## 2. Remove the temporary test binding (optional)

The sandbox added `@rolldown/binding-linux-arm64-gnu` (`--no-save`, not in your
lockfile) to run vitest. `npm ci` clears it; or ignore it (never loads on macOS).

## 3. Run the suite on your machine

```bash
npm test    # expect ~193 passing
```

---

## Staging QA checklist (per feature)

### Verdict share links (already committed)
- `/api/og/verdict?ref=<ref>` renders the verdict PNG; tampered ref → 404.
- A `/c/<ref>` link unfurls as the verdict card on X / Slack / iMessage / FB debugger.

### A — Blind-compare challenge
- Open `/c/<ref>` as a fresh visitor → hook ("@x ranked these…").
- "Rank blind" → rank page shows the challenge banner → submit → lands on `/c/<ref>` reveal with crowd % + vs-sharer %.
- "Just show me the results" → drops to `/r/<token>` spoiler view.
- Anon viewer end-to-end; sharer-views-own-link → vs-sharer line hidden.

### B — Taste identity + privacy
- Run the cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://<staging>/api/cron/taste-matches` → `taste_matches` populates.
- Your profile shows twin + nemesis (owner-only); another profile shows "you two agree X%".
- Settings → toggle Private → your profile hides data to others + is `noindex`; you still see your own.
- A private user never appears as anyone's twin/nemesis or in discovery.

### C — Taste discovery
- Viewer with matches → feed discover shows taste-ranked users with "ranks like you %"; follow one → they drop off.
- Cold-start viewer → discover falls back to follower-count.
- Payoff shows the taste-twin card + "see who ranks like you" CTA; anon payoff shows neither.

### D — Consensus + distribution
- `/s/` and `/r/`: tap an item → histogram with correct %s + "you" marker; no N/A row.
- Contention dots on divisive items only (past the ranker gate); "most divisive" sort reorders community view only.
- Item with <3 rankers → "not enough rankings yet".

### E — Start-from-template gallery
- Flag a public list as a template in admin (`/admin/lists`) → it appears in `/templates` under its category; a non-public list can't be flagged.
- "Use this template" while signed in → new draft titled cleanly (no "Copy of") → lands in the rank flow.
- Signed-out "use template" → auth modal → after login, re-click clones.
- A taken-down (but public) template does NOT appear in the gallery.

### F — In-app notifications
- Rank someone else's list → owner gets one aggregating notification + bell badge; rank again → count bumps (one row).
- Follow / taste-twin-change → notification; self-actions + blocked users never notify; mark-all-read clears the badge.

### G — Feed redesign
- "Made for you" shows lists your taste twins ranked (with the twin hook); follow/blocked/already-ranked excluded.
- Fresh account (no twins) → "Made for you" omitted, "Trending" leads; feed never empty.
- Lists with no image show generated covers; tier strips reflect crowd placement; divisiveness label matches.
- Network rows show "you align X%" only where you've ranked that list.

---

## Deferred (known, not built)

- Integration tests for the new routes (`/c`, reveal, og/verdict, discover,
  taste cron, distribution) — only pure helpers are unit-tested.
- Redis-backed rate limiting (current limiter is per-process in-memory).
- Share-link template picker (verdict / hot-takes / crowd) + a distinct
  hot-takes OG card.
- Item import (TMDB/IGDB) for creation friction — the biggest untouched lever.
- Notifications.
