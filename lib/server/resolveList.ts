// Server-only. Never import from client components.
import { prisma } from "@/lib/prisma";
import { parseSlugParam } from "@/lib/listUrl";

export type ResolvedList = { id: number; slug: string; short_id: string };

type ResolveResult =
  | { kind: "canonical"; list: ResolvedList }   // slug matches — render
  | { kind: "redirect"; list: ResolvedList }    // slug mismatch or integer — redirect
  | { kind: "notfound" };                       // unknown id / invalid param

export async function resolveListParam(param: string): Promise<ResolveResult> {
  // ── New format: slug-shortId ──────────────────────────────────────────────
  const parsed = parseSlugParam(param);
  if (parsed) {
    const list = await (prisma.list as any).findUnique({
      where: { short_id: parsed.shortId },
      select: { id: true, slug: true, short_id: true },
    }) as ResolvedList | null;

    if (!list) return { kind: "notfound" };
    if (parsed.slug === list.slug) return { kind: "canonical", list };
    return { kind: "redirect", list };
  }

  // ── Old format: bare positive integer ────────────────────────────────────
  const asInt = Number(param);
  if (Number.isInteger(asInt) && asInt > 0 && String(asInt) === param) {
    const list = await (prisma.list as any).findUnique({
      where: { id: asInt },
      select: { id: true, slug: true, short_id: true },
    }) as ResolvedList | null;

    if (!list) return { kind: "notfound" };
    return { kind: "redirect", list };
  }

  // ── Unrecognised param shape ──────────────────────────────────────────────
  return { kind: "notfound" };
}
