// Server-only. Never import from client components.
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { nameToColor } from "@/lib/itemColor";
import { MIN_OTHER_AUTHED_RANKERS_FOR_NEMESIS } from "@/lib/insightsConfig";

/**
 * Scores the overlap between a viewer's rankings and one other ranker's.
 * "Within" means the tier values differ by at most 1 (≈ adjacent tiers).
 * "Agreed" means exact same tier value.
 * Exported so the scoring rule can be unit-tested in isolation.
 */
export function scoreRankerPair(
  userValueMap: Map<number, number>,
  theirValues: Map<number, number>
): { within: number; agreed: number; both: number } {
  let within = 0, agreed = 0, both = 0;
  for (const [itemId, myValue] of userValueMap) {
    const theirValue = theirValues.get(itemId);
    if (theirValue === undefined) continue;
    both++;
    if (Math.abs(myValue - theirValue) <= 1) within++;
    if (myValue === theirValue) agreed++;
  }
  return { within, agreed, both };
}

export interface PayoffData {
  completion: { rankedCount: number; totalCount: number; isComplete: boolean };
  alignment: {
    pct: number;
    withinOneTier: number;
    perfectMatches: number;
    rankerCount: number;
  };
  hottestTake: {
    itemId: number;
    itemName: string;
    yourTier: string;
    crowdMeanTier: string;
    delta: number;
    pctOfRankersDisagree: number;
  } | null;
  closestMatch: {
    userId: number;
    handle: string;
    avatarColor: string;
    alignmentPct: number;
    agreedCount: number;
    totalCount: number;
  } | null;
  tasteNemesis: {
    userId: number;
    handle: string;
    avatarColor: string;
    alignmentPct: number;
    disagreedCount: number;
    totalCount: number;
  } | null;
  extras: {
    contrarianPicks: number;
    perfectMatchCount: number;
    sTierCount: number;
  };
  rankSimilar: {
    id: number;
    short_id: string;
    slug: string;
    title: string;
    description: string | null;
    category: string;
    img: string | null;
    co_ranker_count: number;
  }[];
  shareToken: string | null;
  archetypeHint: string | null;
}

interface ComputePayoffParams {
  listId: number;
  items: { id: number; name: string | null }[];
  tiers: { title: string; value: number }[];
  userRankings: { itemId: number; value: number }[];
  currentUserId: number | null;
  shareToken: string | null;
}

export async function computePayoff({
  listId,
  items,
  tiers,
  userRankings,
  currentUserId,
  shareToken,
}: ComputePayoffParams): Promise<PayoffData> {
  const listItemIds = items.map((i) => i.id);
  const totalCount = items.length;

  const itemNameMap = new Map(items.map((i) => [i.id, i.name ?? ""]));
  const tiersByValue = new Map(tiers.map((t) => [t.value, t]));
  const validTiers = tiers.filter((t) => t.value > 0);
  const maxTierValue = validTiers.length > 0 ? Math.max(...validTiers.map((t) => t.value)) : 0;

  const userValueMap = new Map<number, number>(userRankings.map((r) => [r.itemId, r.value]));
  const rankedCount = userRankings.length;
  const isComplete = rankedCount === totalCount;

  type SimilarList = {
    id: number;
    short_id: string;
    slug: string;
    title: string;
    description: string | null;
    category: string;
    img: string | null;
    co_ranker_count: number;
  };

  // ── Parallel DB queries ───────────────────────────────────────────────────
  const [
    crowdGrouped,
    itemValueDist,
    otherAuthedRankings,
    authedRankerRows,
    anonRankerRows,
    rankSimilar,
  ] = await Promise.all([
    // Per-item: crowd average value + total ranking count
    (prisma.ranking as any).groupBy({
      by: ["itemId"],
      where: { itemId: { in: listItemIds }, value: { gt: 0 } },
      _avg: { value: true },
      _count: { id: true },
    }) as Promise<{ itemId: number; _avg: { value: number | null }; _count: { id: number } }[]>,

    // Per-item per-value: distribution (for pct disagree)
    (prisma.ranking as any).groupBy({
      by: ["itemId", "value"],
      where: { itemId: { in: listItemIds }, value: { gt: 0 } },
      _count: { id: true },
    }) as Promise<{ itemId: number; value: number; _count: { id: number } }[]>,

    // Individual rankings from other authed users (for closest match)
    prisma.ranking.findMany({
      where: {
        itemId: { in: listItemIds },
        userId: { not: null },
        value: { gt: 0 },
        ...(currentUserId !== null ? { NOT: { userId: currentUserId } } : {}),
      },
      select: {
        userId: true,
        itemId: true,
        value: true,
        user: { select: { username: true } },
      },
    }),

    // Distinct authed rankers (for total rankerCount)
    prisma.ranking.findMany({
      where: { itemId: { in: listItemIds }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),

    // Distinct anon sessions (for total rankerCount)
    prisma.ranking.findMany({
      where: { itemId: { in: listItemIds }, anonymous_session_token: { not: null } },
      select: { anonymous_session_token: true },
      distinct: ["anonymous_session_token"],
    }),

    // Co-ranker similar lists — single query via join table
    listItemIds.length > 0
      ? prisma.$queryRaw<SimilarList[]>(Prisma.sql`
          SELECT
            l.id,
            l.short_id,
            l.slug,
            l.title,
            l.description,
            l.category,
            l.img,
            COUNT(DISTINCT r."userId")::int AS co_ranker_count
          FROM "Ranking" r
          JOIN "_ItemToList" itl ON r."itemId" = itl."A"
          JOIN "List" l ON itl."B" = l.id
          WHERE
            r."userId" IN (
              SELECT DISTINCT cr."userId"
              FROM "Ranking" cr
              WHERE cr."itemId" IN (${Prisma.join(listItemIds)})
                AND cr."userId" IS NOT NULL
                AND cr.value > 0
                ${currentUserId !== null ? Prisma.sql`AND cr."userId" != ${currentUserId}` : Prisma.sql``}
            )
            AND l.id != ${listId}
            AND l.visibility = 'public'
            AND r.value > 0
            AND r."userId" IS NOT NULL
            ${
              currentUserId !== null
                ? Prisma.sql`
            AND NOT EXISTS (
              SELECT 1 FROM "Ranking" ur
              JOIN "_ItemToList" uitl ON ur."itemId" = uitl."A"
              WHERE uitl."B" = l.id
                AND ur."userId" = ${currentUserId}
                AND ur.value > 0
            )`
                : Prisma.sql``
            }
          GROUP BY l.id, l.short_id, l.slug, l.title, l.description, l.category, l.img
          HAVING COUNT(DISTINCT r."userId") >= 2
          ORDER BY co_ranker_count DESC
          LIMIT 5
        `)
      : Promise.resolve([] as SimilarList[]),
  ]);

  const rankerCount = authedRankerRows.length + anonRankerRows.length;

  const crowdMap = new Map<number, { avg: number; count: number }>(
    crowdGrouped.map((r) => [r.itemId, { avg: r._avg.value!, count: r._count.id }])
  );

  // `${itemId}_${value}` -> count
  const valueDistMap = new Map<string, number>(
    itemValueDist.map((r) => [`${r.itemId}_${r.value}`, r._count.id])
  );

  // ── Alignment ─────────────────────────────────────────────────────────────
  let withinOneTier = 0;
  let perfectMatches = 0;
  let totalBoth = 0;

  for (const [itemId, userValue] of userValueMap) {
    const crowd = crowdMap.get(itemId);
    if (!crowd) continue;
    const crowdRounded = Math.round(crowd.avg);
    const d = Math.abs(userValue - crowdRounded);
    totalBoth++;
    if (d <= 1) withinOneTier++;
    if (d === 0) perfectMatches++;
  }

  const alignmentPct = totalBoth > 0 ? Math.round((withinOneTier / totalBoth) * 100) : 0;

  // ── Hottest take ──────────────────────────────────────────────────────────
  let hottestTake: PayoffData["hottestTake"] = null;

  for (const [itemId, userValue] of userValueMap) {
    const crowd = crowdMap.get(itemId);
    if (!crowd || crowd.count < 5) continue;

    const crowdRounded = Math.round(crowd.avg);
    const delta = Math.abs(userValue - crowdRounded);
    if (delta < 3) continue;

    if (!hottestTake || delta > hottestTake.delta) {
      const agreedCount = valueDistMap.get(`${itemId}_${userValue}`) ?? 0;
      hottestTake = {
        itemId,
        itemName: itemNameMap.get(itemId) ?? "?",
        yourTier: tiersByValue.get(userValue)?.title ?? String(userValue),
        crowdMeanTier: tiersByValue.get(crowdRounded)?.title ?? String(crowdRounded),
        delta,
        pctOfRankersDisagree: Math.round((1 - agreedCount / crowd.count) * 100),
      };
    }
  }

  // ── Closest match ─────────────────────────────────────────────────────────
  let closestMatch: PayoffData["closestMatch"] = null;

  // Group other authed rankers' rankings by userId (cap 500 users)
  const rankerMap = new Map<number, { username: string; values: Map<number, number> }>();
  for (const row of otherAuthedRankings) {
    if (row.userId === null) continue;
    const uid = row.userId as number;
    if (!rankerMap.has(uid)) {
      rankerMap.set(uid, {
        username: row.user?.username ?? "?",
        values: new Map(),
      });
    }
    rankerMap.get(uid)!.values.set(row.itemId, row.value);
  }

  const rankerEntries = [...rankerMap.entries()]
    .sort((a, b) => b[1].values.size - a[1].values.size)
    .slice(0, 500);

  let bestPct = -1;
  let worstPct = Infinity;
  let farthestMatch: PayoffData["tasteNemesis"] = null;

  for (const [uid, { username, values: theirValues }] of rankerEntries) {
    const { within, agreed, both } = scoreRankerPair(userValueMap, theirValues);
    if (both === 0) continue;
    const pct = Math.round((within / both) * 100);
    if (pct > bestPct) {
      bestPct = pct;
      closestMatch = {
        userId: uid,
        handle: username,
        avatarColor: nameToColor(username),
        alignmentPct: pct,
        agreedCount: agreed,
        totalCount: both,
      };
    }
    if (pct < worstPct) {
      worstPct = pct;
      farthestMatch = {
        userId: uid,
        handle: username,
        avatarColor: nameToColor(username),
        alignmentPct: pct,
        disagreedCount: both - agreed,
        totalCount: both,
      };
    }
  }

  // Gate: require enough other authed rankers; also exclude when the
  // farthest match is the same person as the closest match (only 1 candidate).
  const tasteNemesis: PayoffData["tasteNemesis"] =
    rankerEntries.length >= MIN_OTHER_AUTHED_RANKERS_FOR_NEMESIS &&
    farthestMatch !== null &&
    farthestMatch.userId !== closestMatch?.userId
      ? farthestMatch
      : null;

  // ── Extras ────────────────────────────────────────────────────────────────
  let contrarianPicks = 0;
  let perfectMatchCount = 0;
  let sTierCount = 0;

  for (const [itemId, userValue] of userValueMap) {
    if (userValue === maxTierValue) sTierCount++;
    const crowd = crowdMap.get(itemId);
    if (crowd) {
      const d = Math.abs(userValue - Math.round(crowd.avg));
      if (d === 0) perfectMatchCount++;
      if (d >= 3 && crowd.count >= 2) contrarianPicks++;
    }
  }

  return {
    completion: { rankedCount, totalCount, isComplete },
    alignment: { pct: alignmentPct, withinOneTier, perfectMatches, rankerCount },
    hottestTake,
    closestMatch,
    tasteNemesis,
    extras: { contrarianPicks, perfectMatchCount, sTierCount },
    rankSimilar: rankSimilar.slice(0, 3),
    shareToken,
    archetypeHint: null,
  };
}
