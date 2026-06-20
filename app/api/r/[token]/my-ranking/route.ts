import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { readAnonSession } from "@/lib/anonSession";

type Params = { params: Promise<{ token: string }> };

// GET /api/r/:token/my-ranking
// Returns the caller's tier placements for this list, or null if they haven't ranked.
// Checks auth cookie first, falls back to rankr_anon_session.
export async function GET(req: Request, { params }: Params) {
  const { token } = await params;

  const list = await (prisma.list as any).findUnique({
    where: { share_token: token },
    select: {
      id: true,
      is_shareable: true,
      tiers: true,
      items: { select: { id: true } },
    },
  });

  if (!list || !list.is_shareable) return new Response(null, { status: 404 });

  const itemIds = (list.items as { id: number }[]).map((i) => i.id);

  // Resolve caller identity — auth user takes priority over anon session
  const authUser = await getUserFromRequest();
  let rawRankings: { itemId: number; value: number }[] = [];

  if (authUser) {
    rawRankings = await prisma.ranking.findMany({
      where: { itemId: { in: itemIds }, userId: authUser.sub },
      select: { itemId: true, value: true },
    });
  } else {
    const sessionToken = await readAnonSession();
    if (sessionToken) {
      rawRankings = await (prisma.ranking as any).findMany({
        where: {
          itemId: { in: itemIds },
          anonymous_session_token: sessionToken,
        },
        select: { itemId: true, value: true },
      });
    }
  }

  if (!rawRankings.length) return NextResponse.json(null);

  // Reconstruct tier placements from stored values
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
