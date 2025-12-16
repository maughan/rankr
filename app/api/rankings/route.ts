import { ItemRanking } from "@/app/types";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    console.log("B", body);

    const items = await Promise.all(
      body.map((d: Pick<ItemRanking, "user" | "itemId" | "value">) =>
        prisma.ranking.create({
          data: {
            itemId: d.itemId,
            user: d.user,
            value: d.value,
            items: {
              connect: [{ id: d.itemId }],
            },
          },
        })
      )
    );

    return Response.json(items);
  } catch (e) {
    console.error(e);
  }
}
