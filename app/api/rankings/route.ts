import { ItemRanking } from "@/app/types";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    console.log("B", body);

    const items = await prisma.ranking.createManyAndReturn({
      data: body.map((d: ItemRanking) => ({
        id: d.id,
        user: d.user,
        value: d.value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    });

    console.log("items", items);
  } catch (e) {
    console.error(e);
  }
}
