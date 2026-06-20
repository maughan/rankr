import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdminViewer } from "@/lib/server/adminAuth";
import { getImpersonationPayload, clearImpersonationCookie } from "@/lib/server/impersonation";
import { captureServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getSuperAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const imp = await getImpersonationPayload();
  if (!imp || imp.adminId !== admin.id) {
    return NextResponse.json({ error: "No active impersonation session." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const endedBy: "manual" | "expiry" = body.endedBy === "expiry" ? "expiry" : "manual";

  const now = new Date();
  const durationSeconds = Math.round((Date.now() - imp.startedAt) / 1000);

  await prisma.impersonationSession.updateMany({
    where: { id: imp.sessionId, ended_at: null },
    data: { ended_at: now, ended_by: endedBy },
  });

  await clearImpersonationCookie();

  await captureServer(String(admin.id), E.IMPERSONATION_ENDED, {
    target_user_id: imp.targetUserId,
    duration_seconds: durationSeconds,
    ended_by: endedBy,
  });

  return NextResponse.json({ ok: true });
}
