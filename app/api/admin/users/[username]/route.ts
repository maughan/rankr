import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { username } = await params;

  const user = await (prisma.user as any).findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      email: true,
      display_name: true,
      bio: true,
      role: true,
      createdAt: true,
      banned_at: true,
      ban_reason: true,
      suspended_until: true,
      onboarding_state: true,
      archetype: true,
      impersonation_opt_out: true,
      _count: {
        select: { lists: true, rankings: true },
      },
    },
  });

  if (!user) return new Response(null, { status: 404 });

  return NextResponse.json({ user });
}
