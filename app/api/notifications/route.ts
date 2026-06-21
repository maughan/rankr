import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedViewer } from "@/lib/server/auth";
import { listUrl } from "@/lib/listUrl";

export async function GET(req: Request) {
  const viewer = await getAuthedViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const PAGE = 20;

  const db = prisma as any;

  const rows = (await db.notification.findMany({
    where: { recipientId: viewer.id },
    orderBy: { updatedAt: "desc" },
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}),
    select: {
      id: true, type: true, count: true, meta: true, read_at: true,
      createdAt: true, updatedAt: true,
      actor: { select: { username: true, display_name: true } },
      list: { select: { title: true, slug: true, short_id: true } },
    },
  })) as any[];

  const hasMore = rows.length > PAGE;
  const page = hasMore ? rows.slice(0, PAGE) : rows;

  const items = page.map((n) => ({
    id: n.id,
    type: n.type,
    count: n.count,
    actorName: n.actor?.display_name ?? n.actor?.username ?? null,
    actorUsername: n.actor?.username ?? null,
    listTitle: n.list?.title ?? null,
    listHref: n.list?.slug && n.list?.short_id ? listUrl({ slug: n.list.slug, short_id: n.list.short_id }) : null,
    meta: (n.meta ?? {}) as Record<string, unknown>,
    read: n.read_at !== null,
    createdAt: n.createdAt,
  }));

  const unread_count = (await db.notification.count({
    where: { recipientId: viewer.id, read_at: null },
  })) as number;

  return NextResponse.json({
    items,
    unread_count,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
