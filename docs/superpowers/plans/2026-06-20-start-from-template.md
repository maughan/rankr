# Start-from-Template Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A curated gallery of ready-made lists that anyone can one-tap clone into their own draft and start ranking — killing the blank-page friction.

**Architecture:** Add an `is_template` flag to `List` (admin-curated). A `GET /api/templates` returns curated templates grouped by category. A gallery UI clones via the existing `POST /api/s/[id]/copy`, extended with an `asTemplate` flag (clean title), then redirects into the rank flow. Reuses clone, list, browse, and admin infrastructure.

**Tech Stack:** Next.js 16, React 19, Prisma/Postgres, RTK Query, vitest.

---

## File Structure

- Modify `prisma/schema.prisma` — `List.is_template`.
- Create `prisma/migrations/<ts>_is_template/migration.sql`.
- Modify `lib/listUrl.ts` — pure `cloneTitle` helper.
- Create `__tests__/cloneTitle.test.ts`.
- Modify `app/api/s/[id]/copy/route.ts` — `asTemplate` branch via `cloneTitle`.
- Create `app/api/templates/route.ts` — curated templates grouped by category.
- Create the gallery UI route + components (mirror `/browse`).
- Modify the create-list entry to link "Start from a template".
- Modify admin list tools (UI + API) — `is_template` toggle.

---

## Task 1: `is_template` flag + clean-title clone (TDD on the helper)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260620000002_is_template/migration.sql`
- Modify: `lib/listUrl.ts`
- Test: `__tests__/cloneTitle.test.ts`
- Modify: `app/api/s/[id]/copy/route.ts`

- [ ] **Step 1: Schema + migration.** In `model List`, after `is_featured`, add:
```prisma
  is_template                Boolean   @default(false)
```
Create `prisma/migrations/20260620000002_is_template/migration.sql`:
```sql
ALTER TABLE "List" ADD COLUMN "is_template" BOOLEAN NOT NULL DEFAULT false;
```
Run `npx prisma generate` (no DB needed). (The human applies the migration; if `prisma generate` can't run in this sandbox, note it — the codebase accesses new columns via `(prisma.list as any)`.)

- [ ] **Step 2: Write the failing test** `__tests__/cloneTitle.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cloneTitle } from "@/lib/listUrl";

describe("cloneTitle", () => {
  it("prefixes 'Copy of' for a normal clone", () => {
    const r = cloneTitle("Chocolate bars", false);
    expect(r.title).toBe("Copy of Chocolate bars");
    expect(r.slug).toBe("copy-of-chocolate-bars");
  });

  it("uses the source title verbatim for a template clone", () => {
    const r = cloneTitle("Chocolate bars", true);
    expect(r.title).toBe("Chocolate bars");
    expect(r.slug).toBe("chocolate-bars");
  });
});
```

- [ ] **Step 3: Run, confirm fail.** `npx vitest run __tests__/cloneTitle.test.ts` → FAIL (`cloneTitle` not exported). (Rolldown binding fix if needed: `npm install --no-save @rolldown/binding-linux-arm64-gnu`.)

- [ ] **Step 4: Implement** in `lib/listUrl.ts` (it already exports `slugify`):
```ts
export function cloneTitle(
  sourceTitle: string,
  asTemplate: boolean
): { title: string; slug: string } {
  const title = asTemplate ? sourceTitle : `Copy of ${sourceTitle}`;
  return { title, slug: slugify(title) };
}
```

- [ ] **Step 5: Run, confirm pass.**

- [ ] **Step 6: Wire into the copy route** `app/api/s/[id]/copy/route.ts`:
  - Change the signature to read the body: `export async function POST(_req: Request, ...)` → use `const body = (await _req.json().catch(() => ({}))) as { asTemplate?: boolean };`.
  - Import `cloneTitle` (already importing `slugify`/`generateShortId` from `@/lib/listUrl`).
  - Replace the inline `title: \`Copy of ${source.title}\`` and `slug: slugify(...)` with:
```ts
      const { title: newTitle, slug: newSlug } = cloneTitle(source.title, !!body.asTemplate);
```
  and use `title: newTitle, slug: newSlug` in the `create`. Everything else unchanged.

- [ ] **Step 7: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint lib/listUrl.ts __tests__/cloneTitle.test.ts "app/api/s/[id]/copy/route.ts"`
```bash
git add prisma/schema.prisma prisma/migrations/20260620000002_is_template lib/listUrl.ts __tests__/cloneTitle.test.ts "app/api/s/[id]/copy/route.ts"
git commit -m "feat: is_template flag + clean-title template clone"
```

---

## Task 2: `GET /api/templates`

**Files:**
- Create: `app/api/templates/route.ts`

Read `lib/server/aggregation.ts` or `app/api/feed/discover/route.ts` for prisma style; use `(prisma.list as any)` for the `is_template` filter (stale generated client convention).

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface TemplateCard {
  id: number;
  short_id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  img: string | null;
  item_count: number;
  preview: { name: string | null; color: string | null }[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const rows = (await (prisma.list as any).findMany({
    where: {
      visibility: "public",
      is_template: true,
      deleted_at: null,
      ...(category ? { category } : {}),
    },
    select: {
      id: true,
      short_id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      img: true,
      items: { select: { name: true, color: true }, take: 5, orderBy: { createdAt: "asc" } },
      _count: { select: { items: true } },
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  })) as {
    id: number; short_id: string; slug: string; title: string;
    description: string | null; category: string; img: string | null;
    items: { name: string | null; color: string | null }[];
    _count: { items: number };
  }[];

  const cards: TemplateCard[] = rows.map((r) => ({
    id: r.id, short_id: r.short_id, slug: r.slug, title: r.title,
    description: r.description, category: r.category, img: r.img,
    item_count: r._count.items, preview: r.items,
  }));

  const byCategory = new Map<string, TemplateCard[]>();
  for (const c of cards) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category)!.push(c);
  }
  const grouped = [...byCategory.entries()].map(([cat, templates]) => ({ category: cat, templates }));

  return NextResponse.json(grouped, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
```

- [ ] **Step 2: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint app/api/templates/route.ts`
```bash
git add app/api/templates/route.ts
git commit -m "feat: templates API (curated, grouped by category)"
```

---

## Task 3: Template gallery UI + create-flow entry

**Files:**
- Create the gallery route under `app/(pages)/templates/` (page + a client list).
- Modify the create-list entry to link "Start from a template".

Read `app/(pages)/browse/page.tsx` and `app/(pages)/browse/[category]/` for card styling and data-fetch patterns; read how the create-list entry works (`grep -rn "useCreateListMutation\|Start ranking\|create.*list" "app/(pages)/feed/page.tsx" app/components` to find the create modal/CTA).

- [ ] **Step 1: Gallery page.** Create `app/(pages)/templates/page.tsx` (+ a client component if interaction is needed). Fetch `GET /api/templates`, render category sections of template cards mirroring `/browse` styling. Each card: title, item count, small color preview, and a **"Use this template"** button. Add `generateMetadata` (indexable — it's a public discovery surface; title "Start from a template — tierstack.dev").

- [ ] **Step 2: "Use this template" clone-to-rank.** In the gallery client, on click:
```ts
const res = await fetch(`/api/s/${template.id}/copy`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ asTemplate: true }),
});
```
If `res.status === 401`, route through the existing auth modal/login (match how `ListDetail`/payoff trigger auth), then retry. On success: `const { slug, short_id } = await res.json(); router.push(\`/s/${slug}-${short_id}/s\`);`. Disable the button while in flight; toast on error (sonner).

- [ ] **Step 3: Create-flow entry.** In the create-list entry point (the modal/CTA found above), add a "Start from a template" option/link → `/templates`. Match existing button styling. Keep "blank list" as the other option.

- [ ] **Step 4: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "app/(pages)/templates/page.tsx"` (+ any new client file + the modified create entry file).
```bash
git add "app/(pages)/templates" <create-entry-file>
git commit -m "feat: start-from-template gallery + create entry"
```

---

## Task 4: Admin `is_template` toggle

**Files:**
- Modify the admin list tools UI (`app/(pages)/admin/...`) + its API route.

Read the admin tools first: `grep -rn "is_featured\|takedown\|toggle" app/\(pages\)/admin app/api/admin` to find how an existing per-list boolean (e.g. `is_featured`) is toggled, and mirror it exactly.

- [ ] **Step 1: API** — add `is_template` to the admin list-update endpoint that already sets `is_featured` (validate boolean; persist via `(prisma.list as any).update`). If `is_featured` isn't admin-toggleable yet, add a minimal `PATCH`/`POST` following the nearest existing admin mutation pattern, gated by the existing admin auth.

- [ ] **Step 2: UI** — add an "Template" toggle next to the existing per-list controls in the admin lists view, wired to the endpoint. Only allow enabling it for `public` lists (disable/guard otherwise).

- [ ] **Step 3: tsc + lint + commit**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint <admin files touched>`
```bash
git add <admin files touched>
git commit -m "feat: admin is_template toggle"
```

---

## Task 5: Verification + final review

- [ ] **Step 1: Suite + types + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
npx eslint lib/listUrl.ts __tests__/cloneTitle.test.ts "app/api/s/[id]/copy/route.ts" app/api/templates/route.ts "app/(pages)/templates/page.tsx"
```
Expected: tsc clean; tests pass (incl. new `cloneTitle`); no new lint errors.

- [ ] **Step 2: Final review subagent** — focus: only `public` lists become templates / are clonable; the copy route's `asTemplate` branch is safe and the default branch is unchanged; clone stays access-checked; no auth bypass on "use template"; gallery cache header safe (public catalog only).

- [ ] **Step 3: Manual / staging checklist**
- Apply the migration: `npx prisma migrate deploy` (or `dev`).
- Flag a public list as a template in admin → it appears in `/templates` under its category.
- "Use this template" while signed in → new draft titled cleanly → lands in the rank flow.
- Signed-out "use template" → auth → continues to the clone.
- A non-public list cannot be flagged / cloned as a template.

---

## Notes

- Migration must be applied by the human (`prisma migrate deploy`); the plan only runs `prisma generate`.
- The deep item/tier copy is fully reused from the existing route — only the title/slug branch is new.
- Keep `(prisma.list as any)` for `is_template` access (stale in-sandbox generated client), matching the established convention.
