import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { NextResponse } from "next/server";
import { getAuthedViewer } from "@/lib/server/auth";
import { buildRichListCard, type RichListCard } from "@/lib/server/feedCards";

const CAP = 8;
const CANDIDATE_LIMIT = 40;

interface TwinEntry {
  userId: number;
  username: string;
  displayName: string | null;
  pct: number;
  sharedItems: number;
  sharedLists: number;
}

export async function GET() {
  const viewer = await getAuthedViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Block relationships ────────────────────────────────────────────────────
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewer.id }, { blockedId: viewer.id }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = new Set(
    blocks.map((b) => (b.blockerId === viewer.id ? b.blockedId : b.blockerId))
  );

  // ── Lists the viewer has already ranked (to exclude) ───────────────────────
  const rankedListIds = (
    await prisma.$queryRaw<{ B: number }[]>(Prisma.sql`
      SELECT DISTINCT itl."B"
      FROM "Ranking" r
      JOIN "_ItemToList" itl ON itl."A" = r."itemId"
      WHERE r."userId" = ${viewer.id} AND r.value > 0
    `)
  ).map((x) => x.B);

  // ── Onboarding starter lists ───────────────────────────────────────────────
  // These are an onboarding tool, not feed content — keep them out of discovery
  // for anyone who hasn't already ranked them (ranked lists are excluded anyway).
  const starterRows = await prisma.onboardingStarter.findMany({
    where: { is_active: true },
    select: { listId: true },
  });
  const starterListIds = new Set(starterRows.map((s) => s.listId));

  // ── Twins (from precomputed taste matches) ─────────────────────────────────
  const viewerRow = (await (prisma.user as any).findUnique({
    where: { id: viewer.id },
    select: { taste_matches: true },
  })) as { taste_matches: { top?: TwinEntry[] } | null } | null;

  const twins = (viewerRow?.taste_matches?.top ?? []).filter(
    (t) => !blockedIds.has(t.userId)
  );
  const twinIds = twins.map((t) => t.userId);

  // ── Helper: load full RichListCards for a set of list ids ──────────────────
  // Filters out non-public / deleted / taken-down lists and banned authors.
  // Returns the card plus the author id so we can drop blocked authors.
  const loadListCards = async (
    listIds: number[]
  ): Promise<Map<number, { card: RichListCard; createdById: number }>> => {
    if (listIds.length === 0) return new Map();
    const lists = await (prisma.list as any).findMany({
      where: {
        id: { in: listIds },
        visibility: "public",
        deleted_at: null,
        taken_down_at: null,
        createdBy: { banned_at: null },
      },
      select: {
        id: true,
        short_id: true,
        slug: true,
        title: true,
        img: true,
        createdById: true,
        items: { select: { color: true, rankings: { select: { value: true }, take: 200, orderBy: { id: "desc" } } } },
        tiers: { select: { title: true, value: true } },
        _count: { select: { rankings: true } },
      },
    });
    const map = new Map<number, { card: RichListCard; createdById: number }>();
    for (const l of lists as any[]) {
      if (blockedIds.has(l.createdById)) continue;
      map.set(l.id, {
        createdById: l.createdById,
        card: buildRichListCard({
          id: l.id,
          short_id: l.short_id,
          slug: l.slug,
          title: l.title,
          img: l.img,
          items: l.items,
          tiers: l.tiers,
          ranking_count: l._count.rankings,
        }),
      });
    }
    return map;
  };

  // ── MADE FOR YOU ───────────────────────────────────────────────────────────
  // Lists that the viewer's twins have ranked, ordered by how many twins ranked
  // each. Excludes lists the viewer already ranked and blocked authors.
  let madeForYou: RichListCard[] = [];
  if (twinIds.length > 0) {
    const twinRanked = await prisma.$queryRaw<
      { listId: number; twinCount: number }[]
    >(Prisma.sql`
      SELECT itl."B" AS "listId", COUNT(DISTINCT r."userId")::int AS "twinCount"
      FROM "Ranking" r
      JOIN "_ItemToList" itl ON itl."A" = r."itemId"
      WHERE r."userId" IN (${Prisma.join(twinIds)}) AND r.value > 0
      GROUP BY itl."B"
      ORDER BY "twinCount" DESC
      LIMIT ${CANDIDATE_LIMIT}
    `);

    const candidateIds = twinRanked
      .map((t) => t.listId)
      .filter((id) => !rankedListIds.includes(id) && !starterListIds.has(id));

    const cards = await loadListCards(candidateIds);

    // Map each candidate list → one twin who actually ranked it, for an accurate
    // sampleName. Bounded by the (≤40) candidate ids + twin ids.
    const sampleByList = new Map<number, number>();
    if (candidateIds.length > 0) {
      const sampleRows = await prisma.$queryRaw<
        { listId: number; userId: number }[]
      >(Prisma.sql`
        SELECT DISTINCT ON (itl."B") itl."B" AS "listId", r."userId" AS "userId"
        FROM "Ranking" r
        JOIN "_ItemToList" itl ON itl."A" = r."itemId"
        WHERE r."userId" IN (${Prisma.join(twinIds)})
          AND r.value > 0
          AND itl."B" IN (${Prisma.join(candidateIds)})
        ORDER BY itl."B", r."userId"
      `);
      for (const row of sampleRows) sampleByList.set(row.listId, row.userId);
    }
    const twinById = new Map(twins.map((t) => [t.userId, t]));

    madeForYou = twinRanked
      .filter((t) => cards.has(t.listId))
      .slice(0, CAP)
      .map((t) => {
        const { card } = cards.get(t.listId)!;
        const sampleTwin = twinById.get(sampleByList.get(t.listId) ?? -1);
        const sampleName =
          sampleTwin?.displayName ?? sampleTwin?.username ?? null;
        return {
          ...card,
          twinSignal: { count: t.twinCount, sampleName },
        };
      });
  }

  // ── TRENDING ────────────────────────────────────────────────────────────────
  // Public lists ordered by ranking count, excluding made-for-you ids, lists the
  // viewer already ranked, and blocked authors.
  const mfyIds = madeForYou.map((c) => c.id);
  const excludeIds = [...new Set([...mfyIds, ...rankedListIds, ...starterListIds])];
  const trendingLists = await (prisma.list as any).findMany({
    where: {
      visibility: "public",
      deleted_at: null,
      taken_down_at: null,
      is_template: false, // seed/starter content shouldn't pollute organic trending
      id: { notIn: excludeIds },
      createdBy: { banned_at: null },
    },
    select: {
      id: true,
      short_id: true,
      slug: true,
      title: true,
      img: true,
      createdById: true,
      items: { select: { color: true, rankings: { select: { value: true } } } },
      tiers: { select: { title: true, value: true } },
      _count: { select: { rankings: true } },
    },
    orderBy: { rankings: { _count: "desc" } },
    take: CAP,
  });

  const trending: RichListCard[] = (trendingLists as any[])
    .filter((l) => !blockedIds.has(l.createdById))
    .map((l) =>
      buildRichListCard({
        id: l.id,
        short_id: l.short_id,
        slug: l.slug,
        title: l.title,
        img: l.img,
        items: l.items,
        tiers: l.tiers,
        ranking_count: l._count.rankings,
      })
    );

  return NextResponse.json({ madeForYou, trending });
}
