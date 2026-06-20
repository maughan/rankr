import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ token: string }> };

// GET /api/r/:token/creator-ranking
// Returns the list creator's tier placements, or null if they haven't ranked.
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const list = await (prisma.list as any).findUnique({
    where: { share_token: token },
    select: {
      id: true,
      is_shareable: true,
      createdById: true,
      tiers: true,
      items: { select: { id: true } },
    },
  });

  if (!list || !list.is_shareable) return new Response(null, { status: 404 });

  const itemIds = (list.items as { id: number }[]).map((i) => i.id);

  const rawRankings = await prisma.ranking.findMany({
    where: { itemId: { in: itemIds }, userId: list.createdById },
    select: { itemId: true, value: true },
  });

  if (!rawRankings.length) return NextResponse.json(null);

  const tiers = (list.tiers as any[]).map((t) => ({
    id: t.id,
    title: t.title,
    color: t.color,
    value: t.value,
    items: [] as number[],
  }));

  for (const r of rawRankings) {
    if (r.value === 0) continue;
    tiers.find((t) => t.value === r.value)?.items.push(r.itemId);
  }

  return NextResponse.json({ tiers });
}
