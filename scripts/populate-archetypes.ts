/**
 * One-shot backfill: compute and store taste archetypes for all eligible users.
 * Skips users whose archetype_computed_at is already set unless --force is passed.
 * Safe to re-run — idempotent when run without --force.
 *
 * Run:
 *   npx tsx scripts/populate-archetypes.ts
 *   npx tsx scripts/populate-archetypes.ts --force   # recompute everyone
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import {
  ARCHETYPE_EVIDENCE_COUNT,
  ARCHETYPE_THRESHOLDS,
  MIN_ITEMS_FOR_ARCHETYPE,
  MIN_LISTS_FOR_ARCHETYPE,
  MIN_RANKERS_FOR_INSIGHTS,
  type ArchetypeSlug,
  type ArchetypeReceipt,
  type ArchetypeStats,
} from "../lib/insightsConfig";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const force = process.argv.includes("--force");

// ── Archetype computation (mirrors lib/server/archetype.ts) ──────────────────
// Duplicated here so the script doesn't pull in Next.js server-only imports.

interface ComputeResult {
  archetype: ArchetypeSlug;
  stats: ArchetypeStats;
}

async function computeArchetype(userId: number): Promise<ComputeResult | null> {
  const rawRankings = await (prisma as any).ranking.findMany({
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
    const sortedTiers = [...list.tiers].sort((a: any, b: any) => b.value - a.value);
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

  const itemIds = [...new Set(rankings.map((r) => r.itemId))];
  const crowdGrouped = (await (prisma as any).ranking.groupBy({
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

    const norm = (r.value - minV) / range;
    normValues.push(norm);
    normSum += norm;

    if (r.value === maxV || r.value === minV) extremeCount++;
    if (r.value !== maxV && r.value !== minV) middleCount++;

    const crowd = crowdMap.get(r.itemId);
    if (crowd && crowd.count >= MIN_RANKERS_FOR_INSIGHTS) {
      const crowdRounded = Math.round(crowd.avg);
      if (Math.abs(r.value - crowdRounded) <= 1) withinCount++;
      alignmentDenominator++;

      const delta = r.value - crowdRounded;
      const absDelta = Math.abs(delta);
      if (absDelta >= 2) {
        const yourTier =
          r.tiers.find((t) => t.value === r.value)?.title ?? String(r.value);
        const crowdTier =
          r.tiers.find((t) => t.value === crowdRounded)?.title ?? String(crowdRounded);
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

  const avgAlignment =
    alignmentDenominator > 0 ? withinCount / alignmentDenominator : 0.5;
  const extremeRatio = extremeCount / n;
  const middleRatio = middleCount / n;
  const generosity = normSum / n;
  const harshness = 1 - generosity;
  const meanNorm = generosity;
  const rawVariance =
    n > 1
      ? normValues.reduce((s, v) => s + (v - meanNorm) ** 2, 0) / n
      : 0;
  const selfVariance = Math.min(rawVariance / 0.25, 1);

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

  evidenceCandidates.sort((a, b) => b.absDelta - a.absDelta);
  const evidence: ArchetypeReceipt[] = evidenceCandidates
    .slice(0, ARCHETYPE_EVIDENCE_COUNT)
    .map(({ absDelta: _absDelta, ...rest }) => rest);

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const candidates = await prisma.user.findMany({
    where: {
      rankings: { some: { value: { gt: 0 } } },
      ...(force ? {} : { archetype_computed_at: null }),
    },
    select: { id: true, username: true },
    orderBy: { id: "asc" },
  });

  const mode = force ? "recomputing all" : "computing unset";
  console.log(`Found ${candidates.length} user(s) to process (${mode}).\n`);

  if (candidates.length === 0) {
    console.log("Nothing to do. Use --force to recompute existing archetypes.");
    return;
  }

  let computed = 0;
  let skipped = 0;
  let errors = 0;
  const breakdown: Record<string, number> = {};

  for (let i = 0; i < candidates.length; i++) {
    const { id, username } = candidates[i];
    const prefix = `[${i + 1}/${candidates.length}] @${username ?? id}`;

    try {
      const result = await computeArchetype(id);
      await (prisma as any).user.update({
        where: { id },
        data: result
          ? {
              archetype: result.archetype,
              archetype_stats: result.stats,
              archetype_computed_at: new Date(),
            }
          : {
              archetype: null,
              archetype_stats: null,
              archetype_computed_at: new Date(),
            },
      });

      if (result) {
        computed++;
        breakdown[result.archetype] = (breakdown[result.archetype] ?? 0) + 1;
        console.log(`  ${prefix} → ${result.archetype} (${result.stats.rankedItemCount} items, ${result.stats.rankedListCount} lists)`);
      } else {
        skipped++;
        console.log(`  ${prefix} → insufficient data, skipped`);
      }
    } catch (err) {
      errors++;
      console.error(`  ${prefix} → ERROR:`, err);
    }
  }

  console.log("\n── Summary ──────────────────────────────");
  console.log(`  Processed : ${candidates.length}`);
  console.log(`  Computed  : ${computed}`);
  console.log(`  Skipped   : ${skipped} (insufficient data)`);
  console.log(`  Errors    : ${errors}`);
  if (Object.keys(breakdown).length > 0) {
    console.log("\n  Breakdown:");
    for (const [slug, count] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${slug.padEnd(12)} ${count}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
