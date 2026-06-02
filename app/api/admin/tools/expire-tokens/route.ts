import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  const viewer = await getSuperAdminViewer();
  if (!viewer) return new Response(null, { status: 404 });

  const result = await prisma.user.updateMany({
    data: { tokenVersion: { increment: 1 } },
  });

  return NextResponse.json({ affected: result.count });
}
