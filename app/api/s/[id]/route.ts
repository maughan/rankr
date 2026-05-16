import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listId = Number(id);

    const list = await prisma.list.findUnique({
      where: { id: listId },
      include: {
        items: {
          include: {
            rankings: {
              include: {
                user: { select: { id: true, username: true } },
              },
            },
          },
        },
        createdBy: { select: { id: true, username: true } },
        tiers: true,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: e }, { status: 500 });
  }
}
