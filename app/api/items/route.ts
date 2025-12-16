import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const item = await prisma.item.create({
      data: {
        title: body.title,
        description: body.description,
        img: body.img,
        createdBy: body.createdBy,
        lists: {
          connect: [{ id: body.listId }],
        },
      },
    });

    return Response.json(item);
  } catch (e) {
    console.error(e);
  }
}
