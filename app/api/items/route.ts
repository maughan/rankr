import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      username: string;
    };

    const item = await prisma.item.create({
      data: {
        title: body.title,
        description: body.description,
        img: body.img,
        createdBy: decoded.username,
        lists: {
          connect: [{ id: body.listId }],
        },
      },
    });

    await prisma.list.update({
      where: {
        id: body.listId,
      },
      data: {
        updatedAt: new Date().toISOString(),
      },
    });

    return Response.json(item);
  } catch (e) {
    console.error(e);
  }
}
