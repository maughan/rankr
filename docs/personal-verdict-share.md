# Personal verdict share links

Let a sharer post a link whose social unfurl shows **their own** result — crowd
alignment %, creator alignment %, and their hottest take — instead of the
generic crowd-verdict card.

## Why it needs a signed ref

The OG image is fetched by a crawler (Slack, X, iMessage, Facebook) with **no
cookie**, so the image route cannot read "who shared this." The share URL must
itself carry the sharer's identity. It is **signed** with the existing
`JWT_SECRET` so it cannot be forged — nobody can mint a verdict link for another
person's `userId`.

This is the opposite trust model from `/api/share/[template]`, which resolves
identity from cookies (private, per-viewer, uncacheable). A signed ref is
public and **CDN-cacheable** because the image is fully determined by the ref.

## Decisions (locked)

- **Metric:** show crowd alignment % as the headline, creator alignment % as a
  secondary stat ("both").
- **Anon:** anonymous rankers (identified by `rankr_anon_session`) can share a
  personal verdict, not just signed-in users.
- **Template choice:** the sharer picks the card (verdict / hot-takes / crowd)
  before sharing; the choice is encoded in the ref.

## Ref payload

```ts
// lib/share/verdictRef.ts
type VerdictRef = {
  l: number;                       // listId
  i: { k: "user"; id: number } | { k: "anon"; sid: string }; // identity
  t: "verdict" | "hot-takes" | "crowd";                       // template
};

export function signVerdictRef(p: VerdictRef): string;   // HMAC/JWT, no expiry
export function verifyVerdictRef(ref: string): VerdictRef | null;
```

Durable (no expiry) — share links must keep working. Use `jsonwebtoken`
(already a dependency) with `JWT_SECRET`, or a compact HMAC of a base64url
payload. Keep the string short for clean URLs.

## URL shape: path segment, not query string

New route: **`/r/[token]/v/[ref]`**.

`/r/[token]` OG metadata lives in `layout.tsx`, and **Next layouts do not
receive `searchParams`** — so `?v=` cannot drive `generateMetadata`. A path
segment is delivered as `params.ref`, so the new segment's `generateMetadata`
builds the verdict OG cleanly. The page body renders the existing shared-list
client experience (re-use the `/r/[token]` client component). Mark `noindex`,
exactly like `/r/`.

## Files

1. **`lib/share/verdictRef.ts`** (new) — `signVerdictRef` / `verifyVerdictRef`.

2. **`app/(pages)/r/[token]/v/[ref]/page.tsx`** (new, server) +
   **`layout.tsx`** (new) —
   - `generateMetadata` verifies `ref`; on success points OG/Twitter image at
     `/api/og/verdict?ref=<ref>`; on failure falls back to the crowd-verdict
     `/api/og/list?id=<shortId>`. `robots: noindex`.
   - Page renders the same client UI as `/r/[token]` (extract that client
     component so both routes share it).

3. **`app/api/og/verdict/route.ts`** (new) —
   - `verifyVerdictRef(ref)` → `{ listId, identity, template }`; 404 on invalid.
   - Reuse **`computePayoff({ listId, identity })`** (`lib/server/payoff.ts`)
     for crowd alignment %, hottest take, taste twin/nemesis.
   - Reuse **`scoreRankerPair`** (same file) for creator alignment %.
   - Render the chosen template at 1200×675.
   - Rate-limit per IP (lift the limiter from `app/api/share/[template]/route.ts`
     into a shared helper). Cache `public, s-maxage=3600, stale-while-revalidate`.

4. **`lib/share/templates/og-verdict.tsx`** (new) — 1200×675, the first mockup:
   big crowd %, secondary creator %, hottest take (item, your tier vs crowd
   tier), mini grid, CTA. Reuse `Brand` / `TierBadge` / `COLORS`.

5. **`app/api/r/[token]/share-ref/route.ts`** (new) — `POST { template }`.
   Resolves identity server-side from cookies (same logic as
   `/api/share/[template]`: auth token first, else `rankr_anon_session`),
   confirms a ranking exists and the list is shareable, returns
   `{ url: "/r/<token>/v/<ref>" }`. Signing stays server-side — the client never
   sees `JWT_SECRET`.

6. **`app/components/payoff/*`** (edit) — the share action lets the user pick a
   template, calls `share-ref`, and shares the returned `/v/<ref>` URL.

## Security / privacy

- Signature blocks `userId` / `anonSession` enumeration — a crawler can render
  a ref but cannot construct one for an arbitrary identity.
- `share-ref` mints only for an existing result on a `is_shareable` list.
- `/v/` pages are `noindex` (share surface, not canonical — canonical stays
  `/s/`).
- Rate-limit `/api/og/verdict` (shared limiter).
- Anon caveat: `rankr_anon_session` can be cleared/expire; a ref keeps working
  because the session id is baked into the signature, but the underlying anon
  rankings must still exist or the card shows the crowd fallback.

## Tasks

1. `verdictRef.ts` + unit tests (sign→verify round-trip, tamper rejection).
2. Extract the shared per-IP rate limiter.
3. `og-verdict.tsx` template.
4. `/api/og/verdict` route (verify → computePayoff + scoreRankerPair → render).
5. `/r/[token]/v/[ref]` segment (metadata + shared client body).
6. `share-ref` mint route.
7. Payoff share UI: template picker + share `/v/<ref>`.
8. Verify: unit tests; staging PNG QA per template; real unfurl on
   X / Slack / iMessage / Facebook debugger; confirm `/v/` is `noindex` and the
   OG response is cacheable.

## Effort

~1–1.5 days. Most logic reuses `computePayoff`, `scoreRankerPair`, and the
existing share templates; the genuinely new surface is the ref signing, the
`/v/` segment, and the OG verdict template.
