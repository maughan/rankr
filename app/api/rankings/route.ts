import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

interface RankingInput {
  itemId: number;
  userId: number;
  value: number;
  listId: number;
}

export interface SpicyTake {
  itemName: string;
  userTier: string;
  crowdTier: string;
  delta: number;
  rankerCount: number;
}

export async function PUT(req: Request) {
  try {
    const body: RankingInput[] = await req.json();

    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return new Response(null, { status: 401 });
    }

    const list = await prisma.list.findUnique({
      where: { id: body[0].listId },
      include: {
        items: { select: { id: true } },
        tiers: { select: { value: true, title: true } },
      },
    });

    const listItemIds = list?.items.map((item) => item.id) ?? [];

    await prisma.ranking.deleteMany({
      where: {
        itemId: { in: listItemIds },
        userId: decoded.sub,
      },
    });

    const rankings = await Promise.all(
      body.map((d) =>
        prisma.ranking.create({
          data: {
            itemId: d.itemId,
            userId: d.userId,
            value: d.value,
          },
        })
      )
    );

    // ── Spicy take detection ──────────────────────────────────────────────────
    const submittedItemIds = body.filter((d) => d.value > 0).map((d) => d.itemId);
    let spicy: SpicyTake | null = null;

    if (submittedItemIds.length > 0 && (list?.tiers.length ?? 0) > 0) {
      const userValueMap = new Map(body.map((d) => [d.itemId, d.value]));
      const tierTitleMap = new Map((list!.tiers).map((t) => [t.value, t.title]));

      const [crowdData, itemRows] = await Promise.all([
        prisma.ranking.groupBy({
          by: ["itemId"],
          where: { itemId: { in: submittedItemIds }, value: { gt: 0 } },
          _avg: { value: true },
          _count: { id: true },
        }),
        prisma.item.findMany({
          where: { id: { in: submittedItemIds } },
          select: { id: true, name: true },
        }),
      ]);

      const itemNameMap = new Map(itemRows.map((i) => [i.id, i.name ?? ""]));

      for (const crowd of crowdData) {
        const rankerCount = crowd._count.id;
        if (rankerCount < 5) continue;

        const crowdMean = crowd._avg.value!;
        const userValue = userValueMap.get(crowd.itemId);
        if (userValue === undefined) continue;

        const delta = Math.abs(userValue - crowdMean);
        if (delta < 3) continue;

        if (!spicy || delta > spicy.delta) {
          const crowdNearestValue = Math.round(crowdMean);
          spicy = {
            itemName: itemNameMap.get(crowd.itemId) ?? "?",
            userTier: tierTitleMap.get(userValue) ?? String(userValue),
            crowdTier: tierTitleMap.get(crowdNearestValue) ?? String(crowdNearestValue),
            delta,
            rankerCount,
          };
        }
      }
    }

    return Response.json({ rankings, spicy });
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }
}
