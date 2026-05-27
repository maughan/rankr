import { prisma } from "@/lib/prisma";
import type { ListPreview } from "@/app/types";
import type { ProfileResponse } from "@/lib/api/profileApi";

export async function getProfileData(
  username: string,
  viewerId: number | null
): Promise<ProfileResponse | null> {
  const user = await (prisma.user as any).findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      createdAt: true,
      archetype: true,
      archetype_stats: true,
    },
  }) as {
    id: number;
    username: string;
    display_name: string | null;
    bio: string | null;
    createdAt: Date;
    archetype: string | null;
    archetype_stats: unknown;
  } | null;

  if (!user) return null;

  const isOwner = viewerId === user.id;

  const [
    viewerFollowRow,
    targetFollowRow,
    blockRow,
    mutualsCount,
    mutualsSample,
    followerCount,
    followingCount,
  ] =
    viewerId && !isOwner
      ? await Promise.all([
          (prisma as any).follow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
            select: { followerId: true },
          }),
          (prisma as any).follow.findUnique({
            where: { followerId_followingId: { followerId: user.id, followingId: viewerId } },
            select: { followerId: true },
          }),
          (prisma as any).block.findFirst({
            where: {
              OR: [
                { blockerId: viewerId, blockedId: user.id },
                { blockerId: user.id, blockedId: viewerId },
              ],
            },
            select: { blockerId: true },
          }),
          (prisma as any).follow.count({
            where: {
              followingId: user.id,
              follower: { followers: { some: { followerId: viewerId } } },
            },
          }),
          (prisma as any).follow.findMany({
            where: {
              followingId: user.id,
              follower: { followers: { some: { followerId: viewerId } } },
            },
            select: { follower: { select: { username: true, display_name: true } } },
            take: 3,
          }),
          (prisma as any).follow.count({ where: { followingId: user.id } }),
          (prisma as any).follow.count({ where: { followerId: user.id } }),
        ])
      : await Promise.all([
          Promise.resolve(null),
          Promise.resolve(null),
          Promise.resolve(null),
          Promise.resolve(0),
          Promise.resolve([]),
          (prisma as any).follow.count({ where: { followingId: user.id } }),
          (prisma as any).follow.count({ where: { followerId: user.id } }),
        ]);

  const viewerFollowsThem = !!viewerFollowRow;
  const theyFollowViewer = !!targetFollowRow;
  const viewerHasBlocked = blockRow !== null && (blockRow as any).blockerId === viewerId;
  const viewerIsBlocked = blockRow !== null && (blockRow as any).blockerId !== viewerId;
  const mutuals =
    viewerId && !isOwner && (mutualsCount as number) > 0
      ? {
          sample: (mutualsSample as any[]).map((r: any) => ({
            username: r.follower.username,
            display_name: r.follower.display_name,
          })),
          total: mutualsCount as number,
        }
      : null;

  const rawLists: any[] = await (prisma.list as any).findMany({
    where: {
      createdById: user.id,
      ...(isOwner ? {} : { visibility: "public" }),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { id: true, username: true } },
      tiers: { select: { id: true, title: true, value: true } },
      items: {
        select: {
          id: true,
          name: true,
          short_label: true,
          color: true,
          rankings: { select: { userId: true, value: true, updatedAt: true } },
        },
      },
    },
  });

  const lists: ListPreview[] = rawLists.map((list) => {
    const rankerSet = new Set<number>();
    const creatorRankMap = new Map<number, number>();
    let lastActivity: Date | null = null;
    let rankingCount = 0;

    for (const item of list.items) {
      rankingCount += item.rankings.length;
      for (const r of item.rankings) {
        rankerSet.add(r.userId);
        if (!lastActivity || r.updatedAt > lastActivity) lastActivity = r.updatedAt;
        if (r.userId === list.createdById) creatorRankMap.set(item.id, r.value);
      }
    }

    const sortedTiers = [...list.tiers].sort((a: any, b: any) => b.value - a.value);
    const topItems: ListPreview["top_tier_items"] = [];
    for (const tier of sortedTiers) {
      if (topItems.length >= 5) break;
      for (const item of list.items) {
        if (topItems.length >= 5) break;
        if (creatorRankMap.get(item.id) === tier.value) {
          topItems.push({
            id: item.id,
            name: item.name,
            short_label: item.short_label,
            color: item.color,
            tier: tier.title,
          });
        }
      }
    }

    return {
      id: list.id,
      short_id: list.short_id,
      slug: list.slug,
      title: list.title,
      description: list.description,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
      visibility: list.visibility,
      img: list.img,
      createdBy: list.createdBy,
      category: list.category,
      item_count: list.items.length,
      ranker_count: rankerSet.size,
      ranking_count: rankingCount,
      last_activity_at: (lastActivity ?? list.updatedAt).toISOString(),
      pinned: false,
      top_tier_items: topItems,
      user_has_ranked: false,
    };
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      createdAt: user.createdAt.toISOString(),
      follower_count: followerCount as number,
      following_count: followingCount as number,
      archetype: (user.archetype ?? null) as import("@/lib/insightsConfig").ArchetypeSlug | null,
      archetype_stats: (user.archetype_stats ?? null) as import("@/lib/insightsConfig").ArchetypeStats | null,
    },
    lists,
    isOwner,
    viewerFollowsThem,
    theyFollowViewer,
    viewerHasBlocked,
    viewerIsBlocked,
    mutuals,
  };
}
