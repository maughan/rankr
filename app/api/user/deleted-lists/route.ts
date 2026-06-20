import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthedViewer } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  const viewer = await getAuthedViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lists = await (prisma.list as any).findMany({
    where: {
      createdById: viewer.id,
      deleted_at: { gte: new Date(Date.now() - GRACE_MS) },
    },
    orderBy: { deleted_at: "desc" },
    select: {
      id: true,
      title: true,
      img: true,
      deleted_at: true,
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(
    lists.map((l: any) => ({
      id: l.id,
      title: l.title,
      img: l.img,
      item_count: l._count.items,
      deleted_at: l.deleted_at.toISOString(),
      expires_at: new Date(
        new Date(l.deleted_at).getTime() + GRACE_MS
      ).toISOString(),
    }))
  );
}
