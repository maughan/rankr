import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { resolveUserByUsername, getBlockBetween } from "@/lib/server/followHelpers";
import { captureServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";
import { notify } from "@/lib/server/notify";

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

  let didFollow = false;
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
    didFollow = true;
  });

  if (didFollow) {
    await captureServer(String(viewer.sub), E.FOLLOW_ADDED, { target_user_id: target.id });
    await notify({ recipientId: target.id, type: "new_follower", actorId: viewer.sub });
  }

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

  let didUnfollow = false;
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
    didUnfollow = true;
  });

  if (didUnfollow) {
    await captureServer(String(viewer.sub), E.FOLLOW_REMOVED, { target_user_id: target.id });
  }

  return new Response(null, { status: 204 });
}
