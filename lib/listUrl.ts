import { customAlphabet } from "nanoid";

// ── Short ID ──────────────────────────────────────────────────────────────────
// 57-char alphabet — excludes 0/O/I/l/1 to prevent visual confusion when
// users type URLs by hand or read them off screenshots.

const SHORT_ID_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SHORT_ID_LENGTH = 8;

export const generateShortId = customAlphabet(SHORT_ID_ALPHABET, SHORT_ID_LENGTH);

export function isValidShortId(s: string): boolean {
  return s.length === SHORT_ID_LENGTH && [...s].every((c) => SHORT_ID_ALPHABET.includes(c));
}

// ── Slug ──────────────────────────────────────────────────────────────────────

const SLUG_MAX = 60;

export function slugify(name: string): string {
  const s = name
    .normalize("NFD")               // decompose accented chars
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")   // non-alphanumeric → hyphen
    .replace(/-+/g, "-")            // collapse runs
    .replace(/^-|-$/g, "");         // trim edges

  if (!s) return "list";

  if (s.length <= SLUG_MAX) return s;

  // Truncate at word boundary
  const truncated = s.slice(0, SLUG_MAX);
  const lastHyphen = truncated.lastIndexOf("-");
  return lastHyphen > SLUG_MAX / 2 ? truncated.slice(0, lastHyphen) : truncated;
}

// ── Clone title ─────────────────────────────────────────────────────────────────

export function cloneTitle(
  sourceTitle: string,
  asTemplate: boolean
): { title: string; slug: string } {
  const title = asTemplate ? sourceTitle : `Copy of ${sourceTitle}`;
  return { title, slug: slugify(title) };
}

// ── URL helpers ───────────────────────────────────────────────────────────────

export function listUrl(list: { slug: string | null; short_id: string | null }): string {
  const slug = list.slug ?? "list";
  const shortId = list.short_id!;
  return `/s/${slug}-${shortId}`;
}

export function listAbsoluteUrl(
  list: { slug: string | null; short_id: string | null },
  origin: string
): string {
  return `${origin}${listUrl(list)}`;
}

// ── Segment parsing ───────────────────────────────────────────────────────────
// Splits "chocolate-bars-aBcXyZ12" → { slug: "chocolate-bars", shortId: "aBcXyZ12" }
// Works even when there's no slug prefix (bare "aBcXyZ12").

export function parseSlugParam(param: string): { shortId: string; slug: string } | null {
  if (param.length < SHORT_ID_LENGTH) return null;

  const shortId = param.slice(-SHORT_ID_LENGTH);
  if (!isValidShortId(shortId)) return null;

  // Everything before the last hyphen is the slug prefix (may be empty)
  const rest = param.slice(0, param.length - SHORT_ID_LENGTH);
  const slug = rest.endsWith("-") ? rest.slice(0, -1) : rest;

  return { shortId, slug };
}
