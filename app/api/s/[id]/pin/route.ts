import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listId = Number(id);

    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as unknown as {
      sub: number;
      tokenVersion: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // `userListPin` requires `prisma generate` after the UserListPin migration
    const db = prisma as any;

    const existing = await db.userListPin.findUnique({
      where: { userId_listId: { userId: decoded.sub, listId } },
    });

    if (existing) {
      await db.userListPin.delete({ where: { id: existing.id } });
      return NextResponse.json({ pinned: false });
    }

    await db.userListPin.create({
      data: { userId: decoded.sub, listId },
    });

    return NextResponse.json({ pinned: true });
  } catch (e) {
    return NextResponse.json({ error: e }, { status: 500 });
  }
}
