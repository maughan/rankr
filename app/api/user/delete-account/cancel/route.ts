import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { sendDeletionCancelled } from "@/lib/email/send";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST() {
  // Accept the request even with an invalidated token (tokenVersion was incremented
  // when deletion was initiated). We verify identity by checking the auth_token cookie
  // directly without tokenVersion validation, because the point is to let them cancel.
  const biscuits = await cookies();
  const token = biscuits.get("auth_token")?.value;
  if (!token) return new Response(null, { status: 401 });

  let decoded: { sub: number };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return new Response(null, { status: 401 });
  }

  const user = await (prisma.user as any).findUnique({
    where: { id: decoded.sub },
    select: { id: true, username: true, email: true, deletion_scheduled_at: true },
  });

  if (!user || !user.deletion_scheduled_at) {
    return NextResponse.json({ error: "No pending deletion found." }, { status: 404 });
  }

  const deletionReq = await (prisma.accountDeletionRequest as any).findUnique({
    where: { user_id: user.id },
  });

  if (!deletionReq || deletionReq.cancelled_at || deletionReq.completed_at) {
    return NextResponse.json({ error: "No active deletion request." }, { status: 404 });
  }

  // Restore access — increment tokenVersion again to issue a fresh valid token
  await (prisma.$transaction as any)([
    (prisma.accountDeletionRequest as any).update({
      where: { id: deletionReq.id },
      data: { cancelled_at: new Date() },
    }),
    (prisma.user as any).update({
      where: { id: user.id },
      data: {
        deletion_scheduled_at: null,
        tokenVersion: { increment: 1 },
      },
    }),
  ]);

  if (user.email) {
    await sendDeletionCancelled({ to: user.email, username: user.username });
  }

  // Clear the stale cookie so they get redirected to login
  biscuits.delete("auth_token");

  return NextResponse.json({ cancelled: true });
}
