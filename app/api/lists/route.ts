import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
  const lists = await prisma.list.findMany({
    include: {
      items: {
        include: {
          rankings: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      },
      createdBy: {
        select: {
          username: true,
          id: true,
        },
      },
      tiers: true,
    },
  });
  return Response.json(lists);
}

export async function POST(req: Request) {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    console.log("DEC", decoded);
    const data = await req.json();

    await prisma.list.create({
      data: {
        title: data.title,
        description: data.description,
        tags: data.tags,
        createdById: decoded.sub,
        tiers: {
          connect: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
            { id: 4 },
            { id: 5 },
            { id: 6 },
            { id: 7 },
          ],
        },
      },
    });

    return Response.json("Success", { status: 200 });
  } catch (e) {
    return Response.error();
  }
}
