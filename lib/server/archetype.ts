// Server-only. Never import from client components.
// Computes a user's taste archetype from all their rankings across all lists.

import { prisma } from "@/lib/prisma";
import {
  ARCHETYPE_EVIDENCE_COUNT,
  ARCHETYPE_THRESHOLDS,
  MIN_ITEMS_FOR_ARCHETYPE,
  MIN_LISTS_FOR_ARCHETYPE,
  MIN_RANKERS_FOR_INSIGHTS,
  type ArchetypeSlug,
  type ArchetypeReceipt,
  type ArchetypeStats,
} from "@/lib/insightsConfig";

// ── Single-list archetype hint ─────────────────────────────────────────────────
// Pure function — no DB. Uses only self-signal features (no crowd data)
// so it can run on the already-loaded rankings from the payoff route.
// Returns null when fewer than 6 items were ranked.

const MIN_ITEMS_FOR_HINT = 6;

export function computeArchetypeHint(
  userRankings: { itemId: number; value: number }[],
  tiers: { title: string; value: number }[]
): ArchetypeSlug | null {
  if (tiers.length < 2) return null;

  const sortedTiers = [...tiers].sort((a, b) => b.value - a.value);
  const maxV = sortedTiers[0].value;
  const minV = sortedTiers[sortedTiers.length - 1].value;
  const range = maxV - minV;
  if (range === 0) return null;

  let extremeCount = 0;
  let middleCount = 0;
  let normSum = 0;
  const normValues: number[] = [];

  for (const r of userRankings) {
    if (r.value <= 0) continue;
    const norm = (r.value - minV) / range;
    normValues.push(norm);
    normSum += norm;
    if (r.value === maxV || r.value === minV) extremeCount++;
    if (r.value !== maxV && r.value !== minV) middleCount++;
  }

  const n = normValues.length;
  if (n < MIN_ITEMS_FOR_HINT) return null;

  const extremeRatio = extremeCount / n;
  const middleRatio = middleCount / n;
  const generosity = normSum / n;
  const harshness = 1 - generosity;

  // Omit contrarian / oracle — those require crowd alignment data.
  const scores: [ArchetypeSlug, number][] = [
    ["purist",     extremeRatio - ARCHETYPE_THRESHOLDS.puristMinExtremeRatio],
    ["diplomat",   middleRatio  - ARCHETYPE_THRESHOLDS.diplomatMinMiddleRatio],
    ["enthusiast", generosity   - ARCHETYPE_THRESHOLDS.enthusiastMinGenerosity],
    ["critic",     harshness    - ARCHETYPE_THRESHOLDS.criticMinHarshness],
  ];

  let archetype: ArchetypeSlug = "wildcard";
  let bestScore = 0;
  for (const [slug, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      archetype = slug;
    }
  }

  return archetype;
}

interface ComputeResult {
  archetype: ArchetypeSlug;
  stats: ArchetypeStats;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function computeArchetype(
  userId: number
): Promise<ComputeResult | null> {
  // Load all of the user's ranked items, joining through item → list to
  // get the tier structure (listId on Ranking is nullable for older rows).
  const rawRankings = await prisma.ranking.findMany({
    where: { userId, value: { gt: 0 } },
    select: {
      itemId: true,
      value: true,
      item: {
        select: {
          name: true,
          lists: {
            select: {
              id: true,
              title: true,
              tiers: {
                where: { value: { gt: 0 } },
                select: { value: true, title: true },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  // Normalise: each ranking must have list + tier context.
  type ValidRanking = {
    itemId: number;
    value: number;
    itemName: string;
    listId: number;
    listTitle: string;
    tiers: { value: number; title: string }[];
  };

  const rankings: ValidRanking[] = [];
  for (const r of rawRankings) {
    const list = r.item.lists[0];
    if (!list || list.tiers.length < 2) continue;
    const sortedTiers = [...list.tiers].sort((a, b) => b.value - a.value);
    rankings.push({
      itemId: r.itemId,
      value: r.value,
      itemName: r.item.name ?? "Unknown",
      listId: list.id,
      listTitle: list.title,
      tiers: sortedTiers,
    });
  }

  const distinctListIds = new Set(rankings.map((r) => r.listId));

  if (
    rankings.length < MIN_ITEMS_FOR_ARCHETYPE ||
    distinctListIds.size < MIN_LISTS_FOR_ARCHETYPE
  ) {
    return null;
  }

  // Crowd averages for all items this user ranked.
  const itemIds = [...new Set(rankings.map((r) => r.itemId))];
  const crowdGrouped = (await (prisma.ranking as any).groupBy({
    by: ["itemId"],
    where: { itemId: { in: itemIds }, value: { gt: 0 } },
    _avg: { value: true },
    _count: { id: true },
  })) as { itemId: number; _avg: { value: number | null }; _count: { id: number } }[];

  const crowdMap = new Map(
    crowdGrouped.map((r) => [
      r.itemId,
      { avg: r._avg.value ?? 0, count: r._count.id },
    ])
  );

  // ── Signal accumulation ───────────────────────────────────────────────────

  let withinCount = 0;
  let alignmentDenominator = 0;
  let extremeCount = 0;
  let middleCount = 0;
  let normSum = 0;
  const normValues: number[] = [];
  const evidenceCandidates: (ArchetypeReceipt & { absDelta: number })[] = [];

  for (const r of rankings) {
    const maxV = r.tiers[0].value;
    const minV = r.tiers[r.tiers.length - 1].value;
    const range = maxV - minV;
    if (range === 0) continue;

    // Normalised tier position: 0 = bottom tier, 1 = top tier.
    const norm = (r.value - minV) / range;
    normValues.push(norm);
    normSum += norm;

    // Extreme = placed in absolute top or bottom tier.
    if (r.value === maxV || r.value === minV) extremeCount++;

    // Middle = not top, not bottom.
    if (r.value !== maxV && r.value !== minV) middleCount++;

    // Alignment vs crowd (only when crowd data is reliable).
    const crowd = crowdMap.get(r.itemId);
    if (crowd && crowd.count >= MIN_RANKERS_FOR_INSIGHTS) {
      const crowdRounded = Math.round(crowd.avg);
      if (Math.abs(r.value - crowdRounded) <= 1) withinCount++;
      alignmentDenominator++;

      const delta = r.value - crowdRounded;
      const absDelta = Math.abs(delta);
      // Collect hot takes as evidence (delta ≥ 2 so they're meaningful).
      if (absDelta >= 2) {
        const yourTier =
          r.tiers.find((t) => t.value === r.value)?.title ?? String(r.value);
        const crowdTier =
          r.tiers.find((t) => t.value === crowdRounded)?.title ??
          String(crowdRounded);
        evidenceCandidates.push({
          itemName: r.itemName,
          listName: r.listTitle,
          yourTier,
          crowdTier,
          delta,
          absDelta,
        });
      }
    }
  }

  const n = normValues.length;
  if (n === 0) return null;

  // ── Derive signals ────────────────────────────────────────────────────────

  // avgAlignment: fraction of crowd-comparable rankings within ±1 tier.
  // Falls back to 0.5 (neutral) when there's no crowd data to compare against.
  const avgAlignment =
    alignmentDenominator > 0 ? withinCount / alignmentDenominator : 0.5;

  const extremeRatio = extremeCount / n;
  const middleRatio = middleCount / n;
  const generosity = normSum / n;
  const harshness = 1 - generosity;

  // selfVariance: population variance of normalised positions, scaled to [0,1].
  // Max variance for a [0,1]-bounded distribution is 0.25 (all-or-nothing).
  const meanNorm = generosity;
  const rawVariance =
    n > 1
      ? normValues.reduce((s, v) => s + (v - meanNorm) ** 2, 0) / n
      : 0;
  const selfVariance = Math.min(rawVariance / 0.25, 1);

  // ── Classify ──────────────────────────────────────────────────────────────
  //
  // Each archetype gets a deviation score: how far above its threshold
  // the dominant signal is. The archetype with the highest positive score wins.
  // If no score is positive, the user is a Wildcard.

  const scores: [ArchetypeSlug, number][] = [
    ["contrarian", ARCHETYPE_THRESHOLDS.contrarianMaxAlignment - avgAlignment],
    ["oracle", avgAlignment - ARCHETYPE_THRESHOLDS.oracleMinAlignment],
    ["purist", extremeRatio - ARCHETYPE_THRESHOLDS.puristMinExtremeRatio],
    ["diplomat", middleRatio - ARCHETYPE_THRESHOLDS.diplomatMinMiddleRatio],
    ["enthusiast", generosity - ARCHETYPE_THRESHOLDS.enthusiastMinGenerosity],
    ["critic", harshness - ARCHETYPE_THRESHOLDS.criticMinHarshness],
  ];

  let archetype: ArchetypeSlug = "wildcard";
  let bestScore = 0;
  for (const [slug, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      archetype = slug;
    }
  }

  // ── Evidence receipts ─────────────────────────────────────────────────────

  evidenceCandidates.sort((a, b) => b.absDelta - a.absDelta);
  const evidence: ArchetypeReceipt[] = evidenceCandidates
    .slice(0, ARCHETYPE_EVIDENCE_COUNT)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ absDelta, ...rest }) => rest);

  // ── Package result ────────────────────────────────────────────────────────

  const round3 = (v: number) => Math.round(v * 1000) / 1000;

  const stats: ArchetypeStats = {
    signals: {
      avgAlignment: round3(avgAlignment),
      extremeRatio: round3(extremeRatio),
      middleRatio: round3(middleRatio),
      generosity: round3(generosity),
      harshness: round3(harshness),
      selfVariance: round3(selfVariance),
    },
    evidence,
    rankedItemCount: n,
    rankedListCount: distinctListIds.size,
  };

  return { archetype, stats };
}
