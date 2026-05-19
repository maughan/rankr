import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import type { ListPreview } from "@/app/types";

function softAuth(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();

  const biscuits = await cookies();
  const viewerId = softAuth(biscuits.get("auth_token")?.value);

  const user = await (prisma.user as any).findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, username: true, display_name: true, bio: true, createdAt: true },
  }) as { id: number; username: string; display_name: string | null; bio: string | null; createdAt: Date } | null;

  if (!user) return new Response(null, { status: 404 });

  const isOwner = viewerId === user.id;

  const rawLists: any[] = await (prisma.list as any).findMany({
    where: {
      createdById: user.id,
      ...(isOwner ? {} : { visibility: "public" }),
    },
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
          rankings: { select: { userId: true, value: true, updatedAt: true } },
        },
      },
    },
  });

  const lists: ListPreview[] = rawLists.map((list) => {
    const rankerSet = new Set<number>();
    const creatorRankMap = new Map<number, number>();
    let lastActivity: Date | null = null;

    for (const item of list.items) {
      for (const r of item.rankings) {
        rankerSet.add(r.userId);
        if (!lastActivity || r.updatedAt > lastActivity) lastActivity = r.updatedAt;
        if (r.userId === list.createdById) creatorRankMap.set(item.id, r.value);
      }
    }

    const sortedTiers = [...list.tiers].sort((a: any, b: any) => b.value - a.value);
    const topItems: ListPreview["top_tier_items"] = [];
    for (const tier of sortedTiers) {
      if (topItems.length >= 5) break;
      for (const item of list.items) {
        if (topItems.length >= 5) break;
        if (creatorRankMap.get(item.id) === tier.value) {
          topItems.push({ id: item.id, name: item.name, short_label: item.short_label, color: item.color, tier: tier.title });
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
      tags: list.tags,
      category_icon: list.category_icon,
      category_color: list.category_color,
      item_count: list.items.length,
      ranker_count: rankerSet.size,
      last_activity_at: (lastActivity ?? list.updatedAt).toISOString(),
      pinned: false,
      top_tier_items: topItems,
      user_has_ranked: false,
    };
  });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      createdAt: user.createdAt.toISOString(),
    },
    lists,
    isOwner,
  });
}
