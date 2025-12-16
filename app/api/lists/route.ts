import { prisma } from "@/lib/prisma";

export async function GET() {
  const lists = await prisma.list.findMany({
    include: {
      items: {
        include: {
          rankings: true,
        },
      },
      tiers: true,
    },
  });
  return Response.json(lists);
}
