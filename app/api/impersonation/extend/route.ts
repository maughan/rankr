import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdminViewer } from "@/lib/server/adminAuth";
import {
  getImpersonationPayload,
  setImpersonationCookie,
  IMPERSONATION_DURATION_MS,
} from "@/lib/server/impersonation";
import { captureServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

export async function POST() {
  const admin = await getSuperAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const imp = await getImpersonationPayload();
  if (!imp || imp.adminId !== admin.id) {
    return NextResponse.json({ error: "No active impersonation session." }, { status: 400 });
  }

  const newExpiresAt = Date.now() + IMPERSONATION_DURATION_MS;

  await prisma.impersonationSession.updateMany({
    where: { id: imp.sessionId, ended_at: null },
    data: { expires_at: new Date(newExpiresAt) },
  });

  await setImpersonationCookie({ ...imp, expiresAt: newExpiresAt });

  await captureServer(String(admin.id), E.IMPERSONATION_EXTENDED, {
    target_user_id: imp.targetUserId,
  });

  return NextResponse.json({ ok: true, expiresAt: newExpiresAt });
}
