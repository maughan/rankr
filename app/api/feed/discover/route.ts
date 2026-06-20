import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthedViewer } from "@/lib/server/auth";

export interface DiscoverUser {
  username: string;
  display_name: string | null;
  latest_list_title: string | null;
  pct: number | null;
  sharedLists: number | null;
}

export async function GET() {
  const viewer = await getAuthedViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [following, blocks] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: viewer.id },
      select: { followingId: true },
    }),
    prisma.block.findMany({
      where: {
        OR: [{ blockerId: viewer.id }, { blockedId: viewer.id }],
      },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  const excludeIds = new Set<number>([
    viewer.id,
    ...following.map((f) => f.followingId),
    ...blocks.map((b) => (b.blockerId === viewer.id ? b.blockedId : b.blockerId)),
  ]);

  const viewerRow = (await (prisma.user as any).findUnique({
    where: { id: viewer.id },
    select: { taste_matches: true },
  })) as {
    taste_matches: {
      top?: { userId: number; username: string; displayName: string | null; pct: number; sharedLists: number }[];
    } | null;
  } | null;

  const topMatches = (viewerRow?.taste_matches?.top ?? []).filter(
    (m) => !excludeIds.has(m.userId)
  ).slice(0, 5);

  if (topMatches.length > 0) {
    const rows = (await (prisma.user as any).findMany({
      where: { id: { in: topMatches.map((m) => m.userId) }, profile_private: false },
      select: {
        id: true,
        username: true,
        display_name: true,
        lists: { where: { visibility: "public" }, orderBy: { updatedAt: "desc" }, take: 1, select: { title: true } },
      },
    })) as { id: number; username: string; display_name: string | null; lists: { title: string }[] }[];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const tasteResult: DiscoverUser[] = topMatches
      .map((m): DiscoverUser | null => {
        const r = byId.get(m.userId);
        if (!r) return null;
        return {
          username: r.username,
          display_name: r.display_name,
          latest_list_title: r.lists[0]?.title ?? null,
          pct: m.pct,
          sharedLists: m.sharedLists,
        };
      })
      .filter((x): x is DiscoverUser => x !== null);
    if (tasteResult.length > 0) return NextResponse.json(tasteResult);
  }

  const users = (await (prisma.user as any).findMany({
    where: {
      id: { notIn: [...excludeIds] },
      profile_private: false,
      lists: { some: { visibility: "public" } },
    },
    select: {
      username: true,
      display_name: true,
      lists: {
        where: { visibility: "public" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { title: true },
      },
    },
    orderBy: { follower_count: "desc" },
    take: 5,
  })) as { username: string; display_name: string | null; lists: { title: string }[] }[];

  const result: DiscoverUser[] = users.map((u) => ({
    username: u.username,
    display_name: u.display_name,
    latest_list_title: u.lists[0]?.title ?? null,
    pct: null,
    sharedLists: null,
  }));

  return NextResponse.json(result);
}
