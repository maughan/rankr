import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { resolveUserByUsername } from "@/lib/server/followHelpers";

// POST /api/u/:username/block — block a user
// Removes any follow edges in both directions, then creates the block row.
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
    return Response.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  await (prisma as any).$transaction(async (tx: any) => {
    // Remove viewer → target follow if present
    const f1 = await tx.follow.findUnique({
      where: { followerId_followingId: { followerId: viewer.sub, followingId: target.id } },
    });
    if (f1) {
      await tx.follow.delete({
        where: { followerId_followingId: { followerId: viewer.sub, followingId: target.id } },
      });
      await tx.user.update({ where: { id: viewer.sub }, data: { following_count: { decrement: 1 } } });
      await tx.user.update({ where: { id: target.id },  data: { follower_count:  { decrement: 1 } } });
    }

    // Remove target → viewer follow if present
    const f2 = await tx.follow.findUnique({
      where: { followerId_followingId: { followerId: target.id, followingId: viewer.sub } },
    });
    if (f2) {
      await tx.follow.delete({
        where: { followerId_followingId: { followerId: target.id, followingId: viewer.sub } },
      });
      await tx.user.update({ where: { id: target.id },  data: { following_count: { decrement: 1 } } });
      await tx.user.update({ where: { id: viewer.sub }, data: { follower_count:  { decrement: 1 } } });
    }

    // Upsert block (idempotent)
    await tx.block.upsert({
      where: { blockerId_blockedId: { blockerId: viewer.sub, blockedId: target.id } },
      create: { blockerId: viewer.sub, blockedId: target.id },
      update: {},
    });
  });

  return new Response(null, { status: 204 });
}

// DELETE /api/u/:username/block — unblock a user (does NOT restore old follows)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const viewer = await getUserFromRequest();
  if (!viewer) return new Response(null, { status: 401 });

  const { username } = await params;
  const target = await resolveUserByUsername(username);
  if (!target) return new Response(null, { status: 404 });

  // Idempotent: deleteMany is a no-op if the row doesn't exist
  await (prisma as any).block.deleteMany({
    where: { blockerId: viewer.sub, blockedId: target.id },
  });

  return new Response(null, { status: 204 });
}
