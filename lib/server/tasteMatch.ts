import { scoreRankerPair } from "@/lib/server/payoff";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import {
  MIN_SHARED_ITEMS_FOR_MATCH,
  MIN_SHARED_LISTS_FOR_MATCH,
  MAX_MATCH_CANDIDATES,
  MAX_DISCOVER_MATCHES,
} from "@/lib/insightsConfig";

export interface TasteMatch {
  userId: number;
  username: string;
  displayName: string | null;
  pct: number;
  sharedItems: number;
  sharedLists: number;
}

export interface TasteMatchCandidate {
  userId: number;
  username: string;
  displayName: string | null;
  within: number;
  both: number;
  sharedLists: number;
}

export interface TasteMatches {
  twin: TasteMatch | null;
  nemesis: TasteMatch | null;
  top: TasteMatch[];
  computedAt: string;
}

function qualifies(c: TasteMatchCandidate): boolean {
  return (
    c.both >= MIN_SHARED_ITEMS_FOR_MATCH &&
    c.sharedLists >= MIN_SHARED_LISTS_FOR_MATCH
  );
}

function toMatch(c: TasteMatchCandidate): TasteMatch {
  return {
    userId: c.userId,
    username: c.username,
    displayName: c.displayName,
    pct: Math.round((c.within / c.both) * 100),
    sharedItems: c.both,
    sharedLists: c.sharedLists,
  };
}

export function pickTwinNemesis(candidates: TasteMatchCandidate[]): {
  twin: TasteMatch | null;
  nemesis: TasteMatch | null;
} {
  const matches = candidates.filter(qualifies).map(toMatch);
  if (matches.length === 0) return { twin: null, nemesis: null };

  const twin = matches.reduce((best, m) =>
    m.pct > best.pct || (m.pct === best.pct && m.sharedItems > best.sharedItems) ? m : best
  );
  if (matches.length === 1) return { twin, nemesis: null };

  const rest = matches.filter((m) => m.userId !== twin.userId);
  const nemesis = rest.reduce((worst, m) =>
    m.pct < worst.pct || (m.pct === worst.pct && m.sharedItems > worst.sharedItems) ? m : worst
  );
  return { twin, nemesis };
}

export function topMatches(
  candidates: TasteMatchCandidate[],
  limit: number
): TasteMatch[] {
  return candidates
    .filter(qualifies)
    .map(toMatch)
    .sort((a, b) => b.pct - a.pct || b.sharedItems - a.sharedItems)
    .slice(0, limit);
}

export function buildPairwise(
  aValues: Map<number, number>,
  bValues: Map<number, number>,
  sharedLists: number
): { pct: number; sharedItems: number; sharedLists: number } | null {
  const { within, both } = scoreRankerPair(aValues, bValues);
  if (both < MIN_SHARED_ITEMS_FOR_MATCH || sharedLists < MIN_SHARED_LISTS_FOR_MATCH) {
    return null;
  }
  return { pct: Math.round((within / both) * 100), sharedItems: both, sharedLists };
}

// Returns null when the user has no qualifying twin/nemesis.
export async function computeTasteMatches(
  userId: number
): Promise<TasteMatches | null> {
  const own = (await prisma.ranking.findMany({
    where: { userId, value: { gt: 0 } },
    select: { itemId: true, value: true },
  })) as { itemId: number; value: number }[];
  if (own.length < MIN_SHARED_ITEMS_FOR_MATCH) return null;

  const ownMap = new Map(own.map((r) => [r.itemId, r.value]));
  const itemIds = [...ownMap.keys()];

  const rows = (await prisma.$queryRaw<
    { userId: number; username: string; display_name: string | null; itemId: number; value: number; listId: number }[]
  >(Prisma.sql`
    SELECT r."userId", u.username, u.display_name, r."itemId", r.value, itl."B" AS "listId"
    FROM "Ranking" r
    JOIN "User" u ON u.id = r."userId"
    JOIN "_ItemToList" itl ON itl."A" = r."itemId"
    WHERE r."itemId" IN (${Prisma.join(itemIds)})
      AND r."userId" IS NOT NULL
      AND r."userId" <> ${userId}
      AND r.value > 0
      AND u.profile_private = false
  `)) as { userId: number; username: string; display_name: string | null; itemId: number; value: number; listId: number }[];

  type Agg = { username: string; displayName: string | null; values: Map<number, number>; lists: Set<number> };
  const byUser = new Map<number, Agg>();
  for (const row of rows) {
    let a = byUser.get(row.userId);
    if (!a) {
      a = { username: row.username, displayName: row.display_name, values: new Map(), lists: new Set() };
      byUser.set(row.userId, a);
    }
    a.values.set(row.itemId, row.value);
    a.lists.add(row.listId);
  }

  const candidates: TasteMatchCandidate[] = [];
  for (const [candId, a] of byUser) {
    const { within, both } = scoreRankerPair(ownMap, a.values);
    if (both === 0) continue;
    candidates.push({
      userId: candId,
      username: a.username,
      displayName: a.displayName,
      within,
      both,
      sharedLists: a.lists.size,
    });
  }

  candidates.sort((x, y) => y.both - x.both);
  const capped = candidates.slice(0, MAX_MATCH_CANDIDATES);

  const { twin, nemesis } = pickTwinNemesis(capped);
  const top = topMatches(capped, MAX_DISCOVER_MATCHES);
  if (!twin && !nemesis && top.length === 0) return null;
  return { twin, nemesis, top, computedAt: new Date().toISOString() };
}
