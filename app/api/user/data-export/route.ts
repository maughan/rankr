import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedViewer } from "@/lib/server/auth";

// How long before a user can request another export (14 days in ms)
const EXPORT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

// GET — return current export request status for the user
export async function GET() {
  const viewer = await getAuthedViewer();
  if (!viewer) return new Response(null, { status: 401 });

  const req = await (prisma.dataExportRequest as any).findFirst({
    where: { user_id: viewer.id },
    orderBy: { requested_at: "desc" },
  });

  if (!req) return NextResponse.json({ request: null });
  return NextResponse.json({ request: req });
}

// POST — create a new export request (rate-limited to once per 14 days)
export async function POST() {
  const viewer = await getAuthedViewer();
  if (!viewer) return new Response(null, { status: 401 });

  const cutoff = new Date(Date.now() - EXPORT_COOLDOWN_MS);

  const recent = await (prisma.dataExportRequest as any).findFirst({
    where: {
      user_id: viewer.id,
      requested_at: { gte: cutoff },
      status: { in: ["pending", "processing", "ready"] },
    },
    orderBy: { requested_at: "desc" },
  });

  if (recent) {
    // Return the existing request — no new one needed
    return NextResponse.json({ request: recent });
  }

  const exportRequest = await (prisma.dataExportRequest as any).create({
    data: { user_id: viewer.id, status: "pending" },
  });

  return NextResponse.json({ request: exportRequest }, { status: 201 });
}
