// Server-only. Never import from client components.
import { prisma } from "@/lib/prisma";

export interface AggregatedTier {
  id: number;
  title: string;
  color: string;
  value: number;
  items: number[];
}

export interface AggregatedItem {
  id: number;
  img: string | null;
  name: string | null;
  color: string | null;
  short_label: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: number; username: string };
}

export interface AggregatedList {
  id: number;
  title: string;
  description: string;
  img: string | null;
  visibility: "public" | "hidden" | "draft" | "private";
  is_shareable: boolean;
  anonymous_rankings_enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: number; username: string };
  tiers: AggregatedTier[];
  items: AggregatedItem[];
  ranker_count: number;
}

// Fetch a list and compute tier placements from averaged rankings.
// Individual user/session rankings are NOT included — safe to expose publicly.
export async function computeListAggregates(
  listId: number
): Promise<AggregatedList | null> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      tiers: true,
      items: {
        select: {
          id: true,
          img: true,
          name: true,
          color: true,
          short_label: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { id: true, username: true } },
        },
      },
      createdBy: { select: { id: true, username: true } },
    },
  });

  if (!list) return null;

  const itemIds = list.items.map((i) => i.id);

  // Average value per item, excluding N/A (value = 0)
  const grouped = await (prisma.ranking as any).groupBy({
    by: ["itemId"],
    where: { itemId: { in: itemIds }, value: { not: 0 } },
    _avg: { value: true },
  });

  const avgByItemId = new Map<number, number>(
    (grouped as { itemId: number; _avg: { value: number | null } }[]).map(
      (r) => [r.itemId, Math.round(r._avg.value ?? 0)]
    )
  );

  // Count distinct rankers: unique userId values + unique anonymous_session_token values.
  // The identity CHECK on Ranking ensures exactly one is set per row, so there's no overlap.
  const [authedCount, anonCount] = await Promise.all([
    (prisma.ranking as any).findMany({
      where: { itemId: { in: itemIds }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }) as Promise<{ userId: number }[]>,
    (prisma.ranking as any).findMany({
      where: {
        itemId: { in: itemIds },
        anonymous_session_token: { not: null },
      },
      select: { anonymous_session_token: true },
      distinct: ["anonymous_session_token"],
    }) as Promise<{ anonymous_session_token: string }[]>,
  ]);

  const ranker_count = authedCount.length + anonCount.length;

  // Populate tiers from averaged values
  const tiers: AggregatedTier[] = list.tiers.map((t) => ({
    ...t,
    items: [] as number[],
  }));

  for (const item of list.items) {
    const avgVal = avgByItemId.get(item.id);
    if (avgVal === undefined) continue;
    tiers.find((t) => t.value === avgVal)?.items.push(item.id);
  }

  return {
    id: list.id,
    title: list.title,
    description: list.description,
    img: list.img,
    visibility: (list as any).visibility,
    is_shareable: (list as any).is_shareable,
    anonymous_rankings_enabled: (list as any).anonymous_rankings_enabled,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    createdBy: list.createdBy,
    tiers,
    items: list.items,
    ranker_count,
  };
}

// Same as above but looks up the list by share_token instead of id.
// Used by the public /r/:token route.
export async function computeListAggregatesByToken(
  token: string
): Promise<AggregatedList | null> {
  const list = await (prisma.list as any).findUnique({
    where: { share_token: token },
    select: { id: true },
  });

  if (!list) return null;
  return computeListAggregates(list.id);
}
