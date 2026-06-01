import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const [openReports, reviewingReports, recentActions] = await Promise.all([
    (prisma.report as any).count({ where: { status: "open" } }),
    (prisma.report as any).count({ where: { status: "reviewing" } }),
    (prisma.moderationAction as any).count({
      where: { created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return NextResponse.json({ openReports, reviewingReports, recentActions });
}
