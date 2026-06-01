import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { computePayoff } from "@/lib/server/payoff";
import { computeArchetypeHint } from "@/lib/server/archetype";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const listId = Number(id);

    const jar = await cookies();
    const token = jar.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { tokenVersion: true },
    });
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return new Response(null, { status: 401 });
    }

    const userId = decoded.sub as number;

    const list = await prisma.list.findUnique({
      where: { id: listId },
      include: {
        tiers: { select: { title: true, value: true } },
        items: { select: { id: true, name: true } },
      },
    });
    if (!list) return new Response(null, { status: 404 });

    const listItemIds = list.items.map((i) => i.id);
    const userRankings = await prisma.ranking.findMany({
      where: { itemId: { in: listItemIds }, userId, value: { gt: 0 } },
      select: { itemId: true, value: true },
    });

    if (userRankings.length === 0) return new Response(null, { status: 404 });

    const payoff = await computePayoff({
      listId,
      items: list.items,
      tiers: list.tiers,
      userRankings,
      currentUserId: userId,
      shareToken: list.is_shareable ? (list.share_token ?? null) : null,
    });

    const archetypeHint = computeArchetypeHint(userRankings, list.tiers);

    return Response.json({ ...payoff, archetypeHint });
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }
}
