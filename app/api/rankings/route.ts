import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

interface RankingInput {
  itemId: number;
  userId: number;
  value: number;
  listId: number;
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
      include: { items: { select: { id: true } } },
    });

    const listItemIds = list?.items.map((i) => i.id) ?? [];

    // Detect first submission (before delete)
    const prevCount = await prisma.ranking.count({
      where: { itemId: { in: listItemIds }, userId: decoded.sub },
    });
    const isFirstSubmit = prevCount === 0;

    await prisma.ranking.deleteMany({
      where: { itemId: { in: listItemIds }, userId: decoded.sub },
    });

    await Promise.all(
      body.map((d) =>
        prisma.ranking.create({
          data: { itemId: d.itemId, userId: d.userId, value: d.value },
        })
      )
    );

    return Response.json({ isFirstSubmit });
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }
}
