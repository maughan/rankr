import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function GET(req: Request) {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor")
    ? Number(searchParams.get("cursor"))
    : undefined;

  const lists = await (prisma.list as any).findMany({
    where: {
      visibility: "public",
      deleted_at: null,
      taken_down_at: null,
      ...(cursor !== undefined ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      title: true,
      visibility: true,
      is_template: true,
      is_featured: true,
      createdBy: { select: { id: true, username: true } },
    },
  });

  const hasMore = lists.length > PAGE_SIZE;
  const page = hasMore ? lists.slice(0, PAGE_SIZE) : lists;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ lists: page, nextCursor, hasMore });
}
