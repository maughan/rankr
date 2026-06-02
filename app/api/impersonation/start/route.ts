import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSuperAdminViewer } from "@/lib/server/adminAuth";
import {
  setImpersonationCookie,
  IMPERSONATION_DURATION_MS,
  ImpersonationPayload,
} from "@/lib/server/impersonation";
import { captureServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getSuperAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { targetUsername, reason } = await req.json();
  if (!targetUsername) {
    return NextResponse.json({ error: "targetUsername is required." }, { status: 400 });
  }

  const target = await (prisma.user as any).findUnique({
    where: { username: targetUsername.toLowerCase() },
    select: { id: true, username: true, role: true, impersonation_opt_out: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Scope limits — enforced here, not just in the UI.
  if (target.id === admin.id) {
    return NextResponse.json({ error: "Cannot impersonate yourself." }, { status: 400 });
  }
  if (target.role === "admin" || target.role === "super_admin") {
    return NextResponse.json(
      { error: "Cannot impersonate admin or super_admin accounts." },
      { status: 403 }
    );
  }
  if (target.impersonation_opt_out) {
    return NextResponse.json(
      { error: "This user has opted out of impersonation." },
      { status: 403 }
    );
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const ua = hdrs.get("user-agent") ?? null;

  const now = Date.now();
  const expiresAt = now + IMPERSONATION_DURATION_MS;

  const session = await prisma.impersonationSession.create({
    data: {
      admin_user_id: admin.id,
      target_user_id: target.id,
      expires_at: new Date(expiresAt),
      ip_address: ip,
      user_agent: ua,
      reason: reason?.trim() || null,
    },
    select: { id: true },
  });

  const payload: ImpersonationPayload = {
    sessionId: session.id,
    adminId: admin.id,
    targetUserId: target.id,
    targetUsername: target.username,
    startedAt: now,
    expiresAt,
  };

  await setImpersonationCookie(payload);

  await captureServer(String(admin.id), E.IMPERSONATION_STARTED, {
    target_user_id: target.id,
    reason: reason?.trim() || null,
  });

  return NextResponse.json({ ok: true, sessionId: session.id });
}
