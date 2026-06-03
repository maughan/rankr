import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getImpersonationPayload } from "@/lib/server/impersonation";

export async function GET() {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // During impersonation, return the target user's profile (with PII redacted).
    const imp = await getImpersonationPayload();
    const isImpersonating = imp !== null && imp.adminId === decoded.sub;
    const targetId = isImpersonating ? imp!.targetUserId : decoded.sub;

    const user = await (prisma.user as any).findUnique({
      where: { id: targetId },
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        bio: true,
        username_changed_at: true,
        tokenVersion: true,
        deletion_scheduled_at: true,
      },
    }) as {
      id: number;
      username: string;
      email: string | null;
      display_name: string | null;
      bio: string | null;
      username_changed_at: Date | null;
      tokenVersion: number;
      deletion_scheduled_at: Date | null;
    } | null;

    if (!user) return new Response(null, { status: 401 });

    // Verify token version only for the real user (not during impersonation).
    if (!isImpersonating && user.tokenVersion !== decoded.tokenVersion) {
      return new Response(null, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      // Redact email when impersonating — admin can see it in /api/admin/users/:username
      email: isImpersonating ? null : user.email,
      display_name: user.display_name,
      bio: user.bio,
      username_changed_at: user.username_changed_at?.toISOString() ?? null,
      deletion_scheduled_at: isImpersonating ? null : (user.deletion_scheduled_at?.toISOString() ?? null),
      // Signal to the settings page that it's in read-only impersonation mode.
      isImpersonating,
    });
  } catch {
    return new Response(null, { status: 401 });
  }
}
