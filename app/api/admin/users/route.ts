import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await (prisma.user as any).findMany({
    where: {
      username: { contains: q, mode: "insensitive" },
    },
    take: 20,
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      display_name: true,
      role: true,
      banned_at: true,
      suspended_until: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}
