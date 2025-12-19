import { ItemRanking } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      throw new Error("Token invalid");
    }

    const list = await prisma.list.findUnique({
      where: {
        id: body[0].listId,
      },
      include: {
        items: {
          select: {
            id: true,
          },
        },
      },
    });

    const listItemIds = list?.items.map((item) => item.id);

    await prisma.ranking.deleteMany({
      where: {
        itemId: {
          in: listItemIds,
        },
        userId: decoded.sub,
      },
    });

    const items = await Promise.all(
      body.map(
        (d: {
          itemId: number;
          userId: number;
          value: number;
          listId: number;
        }) =>
          prisma.ranking.create({
            data: {
              itemId: d.itemId,
              userId: d.userId,
              value: d.value,
            },
          })
      )
    );

    return Response.json(items);
  } catch (e) {
    console.error(e);
  }
}
