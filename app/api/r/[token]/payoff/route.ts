import { prisma } from "@/lib/prisma";
import { readAnonSession } from "@/lib/anonSession";
import { computePayoff } from "@/lib/server/payoff";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;

    const list = await (prisma.list as any).findUnique({
      where: { share_token: token },
      select: {
        id: true,
        is_shareable: true,
        tiers: { select: { title: true, value: true } },
        items: { select: { id: true, name: true } },
      },
    });
    if (!list || !list.is_shareable) return new Response(null, { status: 404 });

    const sessionToken = await readAnonSession();
    if (!sessionToken) return new Response(null, { status: 404 });

    const listItemIds = (list.items as { id: number }[]).map((i) => i.id);

    const userRankings = await (prisma.ranking as any).findMany({
      where: {
        itemId: { in: listItemIds },
        anonymous_session_token: sessionToken,
        value: { gt: 0 },
      },
      select: { itemId: true, value: true },
    }) as { itemId: number; value: number }[];

    if (userRankings.length === 0) return new Response(null, { status: 404 });

    const payoff = await computePayoff({
      listId: list.id,
      items: list.items,
      tiers: list.tiers,
      userRankings,
      currentUserId: null,
      shareToken: token,
    });

    return Response.json(payoff);
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }
}
