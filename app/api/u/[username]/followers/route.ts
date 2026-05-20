import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { resolveUserByUsername } from "@/lib/server/followHelpers";

const PAGE_SIZE = 20;

function softAuth(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return d.sub ?? null;
  } catch {
    return null;
  }
}

// GET /api/u/:username/followers?cursor=<ISO>&limit=<n>
// Returns: { users: FollowUser[], nextCursor: string | null }
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const target = await resolveUserByUsername(username);
  if (!target) return new Response(null, { status: 404 });

  const biscuits = await cookies();
  const viewerId = softAuth(biscuits.get("auth_token")?.value);

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);

  // Blocked user IDs to exclude (both directions), only when viewer is present
  let blockedIds: number[] = [];
  if (viewerId) {
    const blocks = await (prisma as any).block.findMany({
      where: {
        OR: [
          { blockerId: viewerId },
          { blockedId: viewerId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    }) as { blockerId: number; blockedId: number }[];
    blockedIds = blocks.flatMap((b) =>
      b.blockerId === viewerId ? [b.blockedId] : [b.blockerId]
    );
  }

  const rows = await (prisma as any).follow.findMany({
    where: {
      followingId: target.id,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      ...(blockedIds.length ? { followerId: { notIn: blockedIds } } : {}),
    },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          display_name: true,
          ...(viewerId
            ? {
                // Does this follower follow the viewer back?
                following: { where: { followingId: viewerId }, select: { followingId: true } },
                // Does the viewer follow this follower?
                followers: { where: { followerId: viewerId }, select: { followerId: true } },
              }
            : {}),
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  }) as any[];

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null;

  const users = page.map((row: any) => ({
    username: row.follower.username,
    display_name: row.follower.display_name,
    viewerFollowsThem: viewerId ? row.follower.followers?.length > 0 : false,
    theyFollowViewer: viewerId ? row.follower.following?.length > 0 : false,
  }));

  return Response.json({ users, nextCursor });
}
