import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { resolveUserByUsername, getBlockBetween } from "@/lib/server/followHelpers";

// POST /api/u/:username/follow — follow a user (idempotent)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const viewer = await getUserFromRequest();
  if (!viewer) return new Response(null, { status: 401 });

  const { username } = await params;
  const target = await resolveUserByUsername(username);
  if (!target) return new Response(null, { status: 404 });

  if (target.id === viewer.sub) {
    return Response.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  if (await getBlockBetween(viewer.sub, target.id)) {
    return new Response(null, { status: 403 });
  }

  await (prisma as any).$transaction(async (tx: any) => {
    const existing = await tx.follow.findUnique({
      where: {
        followerId_followingId: { followerId: viewer.sub, followingId: target.id },
      },
    });
    if (existing) return; // already following — no-op

    await tx.follow.create({ data: { followerId: viewer.sub, followingId: target.id } });
    await tx.user.update({ where: { id: viewer.sub }, data: { following_count: { increment: 1 } } });
    await tx.user.update({ where: { id: target.id },  data: { follower_count:  { increment: 1 } } });
  });

  return new Response(null, { status: 204 });
}

// DELETE /api/u/:username/follow — unfollow a user (idempotent)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const viewer = await getUserFromRequest();
  if (!viewer) return new Response(null, { status: 401 });

  const { username } = await params;
  const target = await resolveUserByUsername(username);
  if (!target) return new Response(null, { status: 404 });

  await (prisma as any).$transaction(async (tx: any) => {
    const existing = await tx.follow.findUnique({
      where: {
        followerId_followingId: { followerId: viewer.sub, followingId: target.id },
      },
    });
    if (!existing) return; // not following — no-op

    await tx.follow.delete({
      where: {
        followerId_followingId: { followerId: viewer.sub, followingId: target.id },
      },
    });
    await tx.user.update({ where: { id: viewer.sub }, data: { following_count: { decrement: 1 } } });
    await tx.user.update({ where: { id: target.id },  data: { follower_count:  { decrement: 1 } } });
  });

  return new Response(null, { status: 204 });
}
