import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return NextResponse.json({ error: "Invalid token" }, { status: 500 });
    }

    const lists = await prisma.list.findMany({
      where: {
        hidden: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
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
    return NextResponse.json(lists);
  } catch (e) {
    return NextResponse.json({ error: e }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    const data = await req.json();

    await prisma.list.create({
      data: {
        title: data.title,
        description: data.description,
        tags: data.tags,
        createdById: decoded.sub,
        img: data.img,
        hidden: data.hidden,
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

export async function PATCH(req: Request) {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      throw new Error("Token invalid");
    }

    const data = await req.json();

    const ownsList = await prisma.list.findFirst({
      where: {
        id: data.id,
        createdById: user.id,
      },
    });

    if (!ownsList)
      return NextResponse.json(
        { message: "Failed to update list" },
        { status: 401 }
      );

    await prisma.list.update({
      where: {
        id: data.id,
        createdById: user.id,
      },
      data: {
        title: data.title,
        description: data.description,
        img: data.img,
        hidden: data.hidden,
      },
    });

    return NextResponse.json({ messsage: "Success" }, { status: 200 });
  } catch (e) {
    return Response.error();
  }
}
