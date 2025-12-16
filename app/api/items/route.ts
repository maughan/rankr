import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("B", body);

    const item = await prisma.item.create({
      data: {
        title: body.title,
        description: body.description,
        img: body.img,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: body.createdBy,
      },
    });
  } catch (e) {
    console.error(e);
  }
  // const item = await prisma.item.create({
  //   data: {
  //     img: "",
  //     description: "",
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //     createdBy: "",
  //     title: "",
  //   },
  // });
  // return Response.json(item);
}
