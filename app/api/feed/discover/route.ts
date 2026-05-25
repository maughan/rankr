import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthedViewer } from "@/lib/server/auth";

export interface DiscoverUser {
  username: string;
  display_name: string | null;
  latest_list_title: string | null;
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

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: [...excludeIds] },
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
  });

  const result: DiscoverUser[] = users.map((u) => ({
    username: u.username,
    display_name: u.display_name,
    latest_list_title: u.lists[0]?.title ?? null,
  }));

  return NextResponse.json(result);
}
