import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthedViewer } from "@/lib/server/auth";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const PERSONAL_CAP = 3;         // max personal-reward items per page
const REENGAGEMENT_MAX = 2;     // max re-engagement items per page
const REENGAGEMENT_THRESHOLD = 10; // min new rankers to surface a re-engagement item
const REENGAGEMENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function GET(req: Request) {
  const viewer = await getAuthedViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : undefined;
  const isFirstPage = cursor === undefined;
  const limitParam = searchParams.get("limit");
  const limit = Math.min(
    limitParam ? Number(limitParam) : DEFAULT_LIMIT,
    MAX_LIMIT
  );

  // ── Block relationships ─────────────────────────────────────────────────────
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewer.id }, { blockedId: viewer.id }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = new Set(
    blocks.map((b) => (b.blockerId === viewer.id ? b.blockedId : b.blockerId))
  );

  // ── Who the viewer follows ──────────────────────────────────────────────────
  const following = await prisma.follow.findMany({
    where: { followerId: viewer.id },
    select: { followingId: true },
  });
  const followingIds = following
    .map((f) => f.followingId)
    .filter((id) => !blockedIds.has(id));

  // ── Last-visit window ───────────────────────────────────────────────────────
  const viewerData = await prisma.user.findUnique({
    where: { id: viewer.id },
    select: { last_feed_visit_at: true },
  });
  const since =
    viewerData?.last_feed_visit_at ??
    new Date(Date.now() - 24 * 60 * 60 * 1000);

  // ── Layer 1 — Network events (cursor-paginated) ────────────────────────────
  // Milestones are personal to the creator; exclude from the network stream.
  let networkItems: object[] = [];
  let nextCursor: number | null = null;
  let hasMore = false;

  if (followingIds.length > 0) {
    const events = await prisma.activityEvent.findMany({
      where: {
        actorId: { in: followingIds },
        type: { not: "milestone" },
        list: {
          visibility: "public",
          deleted_at: null,
          taken_down_at: null,
          createdBy: { banned_at: null },
        } as any,
        ...(cursor !== undefined ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: "desc" },
      take: limit + 1,
      include: {
        actor: { select: { id: true, username: true, display_name: true } },
        list: {
          select: {
            id: true,
            short_id: true,
            slug: true,
            title: true,
            img: true,
            _count: { select: { items: true } },
          },
        },
        item: { select: { id: true, name: true, color: true } },
      },
    });

    hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;
    nextCursor = hasMore ? page[page.length - 1].id : null;

    networkItems = page.map((e) => ({
      key: String(e.id),
      id: e.id,
      type: e.type,
      createdAt: e.createdAt.toISOString(),
      actor: e.actor,
      list: {
        id: e.list.id,
        short_id: e.list.short_id,
        slug: e.list.slug,
        title: e.list.title,
        img: e.list.img,
        item_count: e.list._count.items,
      },
      ...(e.item ? { item: e.item } : {}),
      ...(e.meta
        ? { meta: e.meta as { userVal: number; crowdMean: number; delta: number } }
        : {}),
    }));
  }

  // ── Page 1 only: personal-reward + re-engagement + fallback ───────────────
  let personalItems: object[] = [];
  let fallbackLists: object[] = [];

  if (isFirstPage) {
    // ── 1a. Engagement on viewer's created public lists ─────────────────────
    const viewerLists = await prisma.list.findMany({
      where: { createdById: viewer.id, visibility: "public", deleted_at: null, taken_down_at: null } as any,
      select: {
        id: true,
        short_id: true,
        slug: true,
        title: true,
        img: true,
        _count: { select: { items: true } },
      },
    });

    if (viewerLists.length > 0) {
      const viewerListIds = viewerLists.map((l) => l.id);

      const engagementGroups = await prisma.activityEvent.groupBy({
        by: ["listId"],
        where: {
          listId: { in: viewerListIds },
          type: "ranked",
          createdAt: { gt: since },
          actorId: { not: viewer.id },
        },
        _count: { id: true },
        _max: { createdAt: true },
        orderBy: { _count: { id: "desc" } },
      });

      for (const group of engagementGroups) {
        const count = group._count.id;
        if (count === 0) continue;
        const list = viewerLists.find((l) => l.id === group.listId);
        if (!list) continue;

        personalItems.push({
          key: `engagement-${group.listId}`,
          type: "engagement",
          createdAt: group._max.createdAt?.toISOString() ?? since.toISOString(),
          list: {
            id: list.id,
            short_id: list.short_id,
            slug: list.slug,
            title: list.title,
            img: list.img,
            item_count: list._count.items,
          },
          newRankerCount: count,
        });
      }
    }

    // ── 1b. New followers ───────────────────────────────────────────────────
    const newFollowerRows = await prisma.follow.findMany({
      where: {
        followingId: viewer.id,
        createdAt: { gt: since },
        followerId: { notIn: [...blockedIds] },
      },
      include: {
        follower: { select: { username: true, display_name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (newFollowerRows.length > 0) {
      const totalNewFollowers = await prisma.follow.count({
        where: {
          followingId: viewer.id,
          createdAt: { gt: since },
          followerId: { notIn: [...blockedIds] },
        },
      });

      personalItems.push({
        key: "new_followers",
        type: "new_followers",
        createdAt: newFollowerRows[0].createdAt.toISOString(),
        count: totalNewFollowers,
        samples: newFollowerRows.map((f) => ({
          username: f.follower.username,
          display_name: f.follower.display_name,
        })),
      });
    }

    // ── 1c. Creator milestones ──────────────────────────────────────────────
    const milestoneEvents = await prisma.activityEvent.findMany({
      where: {
        actorId: viewer.id,
        type: "milestone",
        createdAt: { gt: since },
      },
      orderBy: { createdAt: "desc" },
      include: {
        list: {
          select: {
            id: true,
            short_id: true,
            slug: true,
            title: true,
            img: true,
            _count: { select: { items: true } },
          },
        },
      },
    });

    for (const ev of milestoneEvents) {
      const meta = ev.meta as { threshold: number; ranker_count: number } | null;
      if (!meta) continue;
      personalItems.push({
        key: `milestone-${ev.id}`,
        type: "milestone",
        createdAt: ev.createdAt.toISOString(),
        list: {
          id: ev.list.id,
          short_id: ev.list.short_id,
          slug: ev.list.slug,
          title: ev.list.title,
          img: ev.list.img,
          item_count: ev.list._count.items,
        },
        threshold: meta.threshold,
        rankerCount: meta.ranker_count,
      });
    }

    // Rate-limit: sort personal items by recency and cap
    personalItems = (
      personalItems as Array<{ createdAt: string }>
    )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, PERSONAL_CAP);

    // ── Layer 3 — Self re-engagement (only when feed has room) ──────────────
    const totalSoFar = personalItems.length + networkItems.length;
    if (totalSoFar < limit) {
      const thirtyDaysAgo = new Date(Date.now() - REENGAGEMENT_WINDOW_MS);

      // Lists the viewer has ranked (distinct, recent first)
      const viewerRankings = await prisma.ranking.findMany({
        where: { userId: viewer.id, value: { gt: 0 } },
        select: { listId: true, updatedAt: true },
        distinct: ["listId"],
        orderBy: { updatedAt: "desc" },
        take: 30,
      });

      if (viewerRankings.length > 0) {
        const rankedListIds = viewerRankings
          .map((r) => r.listId)
          .filter((id): id is number => id !== null);
        const rankedAtMap = new Map(
          viewerRankings
            .filter((r) => r.listId !== null)
            .map((r) => [r.listId as number, r.updatedAt])
        );

        // Batch: get all ranked events for these lists in the 30-day window
        const recentRankedEvents = await prisma.activityEvent.findMany({
          where: {
            listId: { in: rankedListIds },
            type: "ranked",
            createdAt: { gt: thirtyDaysAgo },
            actorId: { not: viewer.id },
          },
          select: { listId: true, createdAt: true },
        });

        // Client-side: count events after viewer's ranking date for each list
        const newCountByList = new Map<number, number>();
        for (const ev of recentRankedEvents) {
          if (!ev.listId) continue;
          const viewerRankedAt = rankedAtMap.get(ev.listId);
          if (!viewerRankedAt || ev.createdAt <= viewerRankedAt) continue;
          newCountByList.set(
            ev.listId,
            (newCountByList.get(ev.listId) ?? 0) + 1
          );
        }

        // Pick the most active eligible lists (public, above threshold)
        const eligibleIds = [...newCountByList.entries()]
          .filter(([, count]) => count >= REENGAGEMENT_THRESHOLD)
          .sort(([, a], [, b]) => b - a)
          .slice(0, REENGAGEMENT_MAX)
          .map(([id]) => id);

        if (eligibleIds.length > 0) {
          const eligibleLists = await prisma.list.findMany({
            where: { id: { in: eligibleIds }, visibility: "public", deleted_at: null, taken_down_at: null } as any,
            select: {
              id: true,
              short_id: true,
              slug: true,
              title: true,
              img: true,
              _count: { select: { items: true } },
            },
          });

          for (const list of eligibleLists) {
            const count = newCountByList.get(list.id) ?? 0;
            personalItems.push({
              key: `re_engagement-${list.id}`,
              type: "re_engagement",
              createdAt: new Date().toISOString(),
              list: {
                id: list.id,
                short_id: list.short_id,
                slug: list.slug,
                title: list.title,
                img: list.img,
                item_count: list._count.items,
              },
              newRankerCount: count,
            });
          }
        }
      }
    }

    // ── Layer 4 — All-lists fallback ────────────────────────────────────────
    const totalFinal = personalItems.length + networkItems.length;
    if (totalFinal < limit) {
      const lists = await prisma.list.findMany({
        where: { visibility: "public", deleted_at: null, taken_down_at: null } as any,
        orderBy: [{ is_featured: "desc" }, { updatedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          short_id: true,
          slug: true,
          title: true,
          img: true,
          _count: { select: { items: true, rankings: true } },
        },
      });

      fallbackLists = lists.map((l) => ({
        id: l.id,
        short_id: l.short_id,
        slug: l.slug,
        title: l.title,
        img: l.img,
        item_count: l._count.items,
        ranking_count: l._count.rankings,
      }));
    }
  }

  // ── Combine and respond ─────────────────────────────────────────────────────
  const allItems = [...personalItems, ...networkItems];

  return NextResponse.json({
    items: allItems,
    nextCursor,
    hasMore,
    fallbackLists: isFirstPage ? fallbackLists : [],
  });
}
