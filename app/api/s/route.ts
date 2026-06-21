import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { CATEGORY_SLUGS_SET } from "@/lib/categories";
import { generateShortId, slugify } from "@/lib/listUrl";
import { computeETag, checkETagMatch } from "@/lib/server/etag";
import { captureServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";

function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!) as unknown as {
    sub: number;
    tokenVersion: number;
  };
}

export async function GET(_req: Request) {
  try {
    // Soft auth: include pin data when a valid token is present, but don't require it
    let viewerId: number | null = null;
    try {
      const biscuits = await cookies();
      const token = biscuits.get("auth_token")?.value;
      if (token) {
        const decoded = verifyToken(token);
        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
          select: { tokenVersion: true },
        });
        if (user && user.tokenVersion === decoded.tokenVersion) {
          viewerId = decoded.sub;
        }
      }
    } catch {
      // Invalid or expired token — serve as anonymous
    }

    // `pins` requires `prisma generate` after the UserListPin migration
    const lists: any[] = await prisma.list.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: { select: { id: true, username: true } },
        tiers: { select: { id: true, title: true, value: true } },
        items: {
          select: {
            id: true,
            name: true,
            short_label: true,
            color: true,
            rankings: {
              select: { userId: true, value: true, updatedAt: true },
            },
          },
        },
        ...(viewerId !== null && {
          pins: {
            where: { userId: viewerId },
            select: { id: true },
          },
        }),
      } as any,
    });

    const filteredLists: any[] = lists.filter(
      (list) =>
        list.visibility === "public" ||
        list.createdBy.id === viewerId ||
        (list.items
          .map((i: any) => i.rankings.map((r: any) => r.userId))
          .flat()
          .some((r: any) => r === viewerId) &&
          list.visibility === "private"),
    );

    const result = filteredLists.map((list) => {
      const creatorRankMap = new Map<number, number>(); // itemId → tier value
      let lastActivity: Date | null = null;
      const rankerSet = new Set<number>();
      let rankingCount = 0;
      let userHasRanked = false;

      for (const item of list.items) {
        rankingCount += item.rankings.length;
        for (const r of item.rankings) {
          rankerSet.add(r.userId);
          if (!lastActivity || r.updatedAt > lastActivity) {
            lastActivity = r.updatedAt;
          }
          if (r.userId === list.createdById) {
            creatorRankMap.set(item.id, r.value);
          }
          if (viewerId !== null && r.userId === viewerId && r.value !== 0) {
            userHasRanked = true;
          }
        }
      }

      // Tiers sorted high→low by value; exclude N/A (value === 0)
      const sortedTiers = [...list.tiers]
        .filter((t) => t.value > 0)
        .sort((a, b) => b.value - a.value);

      const topItems: {
        id: number;
        name: string | null;
        short_label: string | null;
        color: string | null;
        tier: string;
      }[] = [];

      for (const tier of sortedTiers) {
        if (topItems.length >= 5) break;
        for (const item of list.items) {
          if (topItems.length >= 5) break;
          if (creatorRankMap.get(item.id) === tier.value) {
            topItems.push({
              id: item.id,
              name: item.name,
              short_label: item.short_label,
              color: item.color,
              tier: tier.title,
            });
          }
        }
      }

      return {
        id: list.id,
        short_id: list.short_id,
        slug: list.slug,
        title: list.title,
        description: list.description,
        createdAt: list.createdAt.toISOString(),
        updatedAt: list.updatedAt.toISOString(),
        visibility: list.visibility,
        img: list.img,
        createdBy: list.createdBy,
        category: list.category,
        item_count: list.items.length,
        ranker_count: rankerSet.size,
        ranking_count: rankingCount,
        last_activity_at: (lastActivity ?? list.updatedAt).toISOString(),
        pinned: viewerId !== null && (list.pins?.length ?? 0) > 0,
        top_tier_items: topItems,
        user_has_ranked: userHasRanked,
      };
    });

    const etag = computeETag(result);
    if (checkETagMatch(_req, etag)) return new Response(null, { status: 304 });

    return NextResponse.json(result, { headers: { ETag: etag } });
  } catch (e) {
    return NextResponse.json({ error: e }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      throw new Error("Token invalid");
    }

    const data = await req.json();

    const created = await prisma.list.create({
      data: {
        title: data.title,
        description: data.description,
        createdById: decoded.sub,
        img: data.img,
        visibility: data.visibility ?? "draft",
        short_id: generateShortId(),
        slug: slugify(data.title ?? "list"),
        category: CATEGORY_SLUGS_SET.has(data.category)
          ? data.category
          : "other",
        tiers: {
          connect: [
            { id: 1 },
            { id: 2 },
            { id: 3 },
            { id: 4 },
            { id: 5 },
            { id: 6 },
            { id: 7 },
            { id: 8 },
          ],
        },
      },
    });

    await captureServer(String(decoded.sub), E.LIST_CREATED, {
      list_id: created.id,
      category: created.category,
      item_count: 0,
    });

    return Response.json("Success", { status: 200 });
  } catch {
    return Response.error();
  }
}

export async function PATCH(req: Request) {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      throw new Error("Token invalid");
    }

    const data = await req.json();

    const ownsList = await prisma.list.findFirst({
      where: { id: data.id, createdById: user.id },
      select: {
        id: true,
        visibility: true,
        is_shareable: true,
        has_been_published: true,
        items: { select: { id: true } },
      },
    });

    if (!ownsList) {
      return NextResponse.json(
        { message: "Failed to update list" },
        { status: 401 },
      );
    }

    // Transition rule: block regression to draft once rankings exist
    if (data.visibility === "draft" && ownsList.visibility !== "draft") {
      const itemIds = ownsList.items.map((i: { id: number }) => i.id);
      if (itemIds.length > 0) {
        const rankingCount = await prisma.ranking.count({
          where: {
            OR: [
              { itemId: { in: itemIds } },
              { listId: data.id, is_anonymous: true },
            ],
          },
        });
        if (rankingCount > 0) {
          return NextResponse.json(
            {
              message:
                "Cannot revert to draft after rankings have been submitted.",
            },
            { status: 409 },
          );
        }
      }
    }

    const isPublishing =
      data.visibility === "public" && ownsList.visibility !== "public";
    const isLeavingPublic =
      data.visibility &&
      data.visibility !== "public" &&
      ownsList.visibility === "public";

    await prisma.list.update({
      where: { id: data.id, createdById: user.id },
      data: {
        title: data.title,
        // Regenerate slug whenever the title changes so canonical redirects stay fresh
        ...(data.title !== undefined && { slug: slugify(data.title) }),
        description: data.description,
        img: data.img,
        ...(data.visibility && { visibility: data.visibility }),
        // Kill share link when leaving public
        ...(isLeavingPublic &&
          ownsList.is_shareable && {
            is_shareable: false,
            share_token: null,
            share_token_created_at: null,
          }),
        // Record first publish timestamp
        ...(isPublishing &&
          !ownsList.has_been_published && {
            has_been_published: true,
            published_at: new Date(),
          }),
        ...(data.category &&
          CATEGORY_SLUGS_SET.has(data.category) && {
            category: data.category,
          }),
        ...(typeof data.allow_contributions === "boolean" && {
          allow_contributions: data.allow_contributions,
        }),
      },
    });

    if (isPublishing) {
      await Promise.all([
        prisma.activityEvent.create({
          data: { actorId: user.id, type: "published", listId: data.id },
        }),
        captureServer(String(user.id), E.LIST_PUBLISHED, {
          list_id: data.id,
          visibility: data.visibility,
          from_state: ownsList.visibility,
        }),
      ]);
    }

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (e) {
    console.log("ERR", e);
    return Response.error();
  }
}
