import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedViewer } from "@/lib/server/auth";
import * as argon2 from "argon2";
import { sendDeletionScheduled } from "@/lib/email/send";

const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tierstack.dev";

export async function POST(req: Request) {
  const viewer = await getAuthedViewer();
  if (!viewer) return new Response(null, { status: 401 });

  const { password, reason } = await req.json();

  // Re-authentication required
  const user = await (prisma.user as any).findUnique({
    where: { id: viewer.id },
    select: { id: true, username: true, email: true, password: true, deletion_scheduled_at: true },
  });
  if (!user) return new Response(null, { status: 401 });

  if (user.deletion_scheduled_at) {
    return NextResponse.json({ error: "Deletion already scheduled." }, { status: 409 });
  }

  const valid = await argon2.verify(user.password, password);
  if (!valid) return new Response("Invalid password.", { status: 403 });

  const scheduledAt = new Date(Date.now() + GRACE_PERIOD_MS);

  await (prisma.$transaction as any)([
    (prisma.accountDeletionRequest as any).create({
      data: {
        user_id: user.id,
        scheduled_deletion_at: scheduledAt,
        reason: reason ?? null,
      },
    }),
    // Suspend the account immediately — increment tokenVersion to invalidate sessions
    (prisma.user as any).update({
      where: { id: user.id },
      data: {
        deletion_scheduled_at: scheduledAt,
        tokenVersion: { increment: 1 },
      },
    }),
  ]);

  if (user.email) {
    await sendDeletionScheduled({
      to: user.email,
      username: user.username,
      scheduledAt,
      cancelUrl: `${SITE_URL}/settings/account/cancel-deletion`,
    });
  }

  return NextResponse.json({ scheduledAt });
}
