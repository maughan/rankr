import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const admin = await getSuperAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ? Number(searchParams.get("cursor")) : undefined;
  const filterAdmin = searchParams.get("admin_id") ? Number(searchParams.get("admin_id")) : undefined;
  const filterTarget = searchParams.get("target_id") ? Number(searchParams.get("target_id")) : undefined;

  const rows = await prisma.impersonationSession.findMany({
    where: {
      ...(filterAdmin ? { admin_user_id: filterAdmin } : {}),
      ...(filterTarget ? { target_user_id: filterTarget } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      started_at: true,
      ended_at: true,
      expires_at: true,
      reason: true,
      ended_by: true,
      write_attempts: true,
      admin_user: { select: { id: true, username: true } },
      target_user: { select: { id: true, username: true } },
    },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ sessions: page, hasMore, nextCursor });
}
