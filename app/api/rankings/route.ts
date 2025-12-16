import { ItemRanking } from "@/app/types";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    console.log("B", body);

    const items = await Promise.all(
      body.map((d: ItemRanking) =>
        prisma.ranking.create({
          data: {
            id: d.id,
            user: d.user,
            value: d.value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: {
              connect: [{ id: d.id }],
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
