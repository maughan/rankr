import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// GET /api/s/:id/share/stats — creator-only share status + submission counts
export async function GET(req: Request, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  const listId = Number(id);

  const list = await (prisma.list as any).findUnique({
    where: { id: listId },
    select: {
      createdById: true,
      is_shareable: true,
      share_token: true,
      share_token_created_at: true,
      anonymous_rankings_enabled: true,
      items: { select: { id: true } },
    },
  });

  if (!list) return new Response(null, { status: 404 });
  if (list.createdById !== user.sub) return new Response(null, { status: 403 });

  const itemIds = list.items.map((i: { id: number }) => i.id);

  // Count distinct authenticated rankers and anonymous rankers separately
  const [authedRankers, anonRankers] = await Promise.all([
    (prisma.ranking as any).findMany({
      where: { itemId: { in: itemIds }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    (prisma.ranking as any).findMany({
      where: {
        itemId: { in: itemIds },
        anonymous_session_token: { not: null },
      },
      select: { anonymous_session_token: true },
      distinct: ["anonymous_session_token"],
    }),
  ]);

  const { protocol, host } = new URL(req.url);
  const share_url = list.share_token
    ? `${protocol}//${host}/r/${list.share_token}`
    : null;

  return NextResponse.json({
    is_shareable: list.is_shareable,
    share_token: list.share_token,
    share_token_created_at: list.share_token_created_at,
    anonymous_rankings_enabled: list.anonymous_rankings_enabled,
    share_url,
    ranker_count: authedRankers.length + anonRankers.length,
    authed_ranker_count: authedRankers.length,
    anon_ranker_count: anonRankers.length,
  });
}
