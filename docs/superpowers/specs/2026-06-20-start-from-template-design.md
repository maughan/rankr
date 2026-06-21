# Start-from-template gallery — design

## Goal

Kill the blank-page friction in list creation: let anyone browse a curated
gallery of ready-made lists and one-tap clone one into their own draft, landing
straight in the ranking flow. Reuses the existing clone infrastructure.

## Decisions (locked)

- Templates are **admin-curated** (a flag on a list), not auto-surfaced popular
  lists.
- After cloning, drop the user **straight into ranking** the new draft.
- Clone uses a **clean title** (the template's name), not "Copy of …".
- Competitor-popular categories inform *what to seed* (you create + flag the
  lists) — no scraping.

## Background (reuse)

- `POST /api/s/[id]/copy` already deep-copies a list: title `Copy of <title>`,
  `visibility: draft`, copies items (name/color/short_label/img), connects the
  default tiers (ids 1-8), returns `{ id, short_id, slug }`. Access-checked via
  `canView`.
- `List` already has `category` (grouping) and `is_featured`; the rank flow is
  `/s/<slug>-<short_id>/s`; `/browse` provides card styling to mirror.
- Admin tooling exists under `app/(pages)/admin/` + `app/api/admin/`.

## Data model

Prisma migration on `List`:
- `is_template Boolean @default(false)`.

Templates = lists with `visibility: "public"` AND `is_template: true`. Curated
by an admin toggle. No new table.

## Clone — clean-title branch

Extend `POST /api/s/[id]/copy` to accept an optional JSON body
`{ asTemplate?: boolean }`:
- When `asTemplate` is true, the new list's `title` is the source title verbatim
  (and `slug` from it) instead of the `Copy of …` prefix. Everything else
  (draft visibility, item copy, tier connect, ownership) is unchanged.
- Default (no body / `asTemplate` falsy) preserves today's exact behaviour.

The route currently reads no body; add a tolerant parse
(`await _req.json().catch(() => ({}))`).

## Templates API

`GET /api/templates` (optional `?category=`):
- Query `List` where `visibility: "public"`, `is_template: true`,
  `deleted_at: null`; select `id, short_id, slug, title, description, category,
  img`, item count, and a few preview item names/colors.
- Return grouped by `category` (array of `{ category, templates: TemplateCard[] }`),
  ordered by a stable category order then by title.
- `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` — the
  catalog changes rarely.

`TemplateCard = { id, short_id, slug, title, description, category, img, item_count, preview: { name, color }[] }`.

## Gallery UI

- A browsable gallery grouped by category, mirroring `/browse` card styling.
  Each card shows title, item count, a small preview, and a **"Use this
  template"** button.
- Surface it at two entry points:
  1. A standalone route (e.g. `/templates`) linked from the create entry point
     and the landing "start" CTA.
  2. A "Start from a template" option in the create-list entry (the modal/flow
     that currently offers a blank list) — links into the gallery.
- "Use this template" (signed-in): `POST /api/s/[id]/copy` with
  `{ asTemplate: true }` → on success redirect to `/s/<slug>-<short_id>/s`
  (the rank flow). Signed-out: route through the existing auth modal/login,
  then continue. Disable the button while the clone is in flight.

## Admin curation

Add an `is_template` toggle to the existing admin list tools
(`app/(pages)/admin/...` + the corresponding admin API). Follows the existing
admin mutation pattern (e.g. how `is_featured` or takedown flags are set). You
flag the seed lists you author.

## Privacy / safety

- Only `public` lists can be templates (enforced in the query and ideally in the
  admin toggle).
- Clone remains access-checked by the existing `canView`; templates are public
  so any signed-in user may clone.
- Cloned list is a private `draft` owned by the cloner — no exposure of the
  template author's identity beyond the public template itself.

## Testing

- Unit/route: the copy route's `asTemplate` branch yields a clean title +
  slug; default branch still yields `Copy of …` (guard against regression).
- Integration/staging: gallery lists curated templates grouped by category;
  "Use this template" clones and lands in the rank flow; signed-out flow routes
  through auth; admin toggle flips `is_template`.

## Out of scope

- Auto-surfacing popular public lists as templates (admin-curated only for now).
- Importing items from external catalogs (explicitly dropped).
- A template search box (browse-by-category is enough for v1; add search later).
