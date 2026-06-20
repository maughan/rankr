import { prisma } from "@/lib/prisma";
import { nameToColor, deriveShortLabel } from "@/lib/itemColor";
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
      throw new Error("Token invalid");
    }

    const items = await prisma.item.findMany();

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
  }
}

export async function POST(req: Request) {
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

    // Verify the caller owns the list, or contributions are open to all logged-in users
    // Verify the caller owns the list, or contributions are open to all logged-in users
    const targetList = await prisma.list.findFirst({
      where: { id: body.listId },
      select: { createdById: true, allow_contributions: true },
    });
    if (!targetList) return new Response(null, { status: 404 });
    const isOwner = targetList.createdById === decoded.sub;
    if (!isOwner && !targetList.allow_contributions) {
      return new Response(null, { status: 403 });
    }

    const names: string[] = body.names;

    const itemPromises = names.map((name: string) =>
      prisma.item.create({
        data: {
          name,
          color: nameToColor(name),
          short_label: deriveShortLabel(name),
          createdById: decoded.sub,
          lists: {
            connect: [{ id: body.listId }],
          },
        },
      })
    );

    const items = await Promise.all(itemPromises);

    await prisma.list.update({
      where: {
        id: body.listId,
      },
      data: {
        updatedAt: new Date().toISOString(),
      },
    });

    return Response.json(items);
  } catch (e) {
    console.error(e);
  }
}
