import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { ICON_NAMES_SET, COLOR_NAMES_SET } from "@/lib/categoryIcons";

function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!) as unknown as {
    sub: number;
    tokenVersion: number;
  };
}

export async function GET() {
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
      where: { hidden: false },
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

    const result = lists.map((list) => {
      const creatorRankMap = new Map<number, number>(); // itemId → tier value
      let lastActivity: Date | null = null;
      const rankerSet = new Set<number>();

      for (const item of list.items) {
        for (const r of item.rankings) {
          rankerSet.add(r.userId);
          if (!lastActivity || r.updatedAt > lastActivity) {
            lastActivity = r.updatedAt;
          }
          if (r.userId === list.createdById) {
            creatorRankMap.set(item.id, r.value);
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
        title: list.title,
        description: list.description,
        createdAt: list.createdAt.toISOString(),
        updatedAt: list.updatedAt.toISOString(),
        hidden: list.hidden,
        img: list.img,
        createdBy: list.createdBy,
        tags: list.tags,
        category_icon: list.category_icon,
        category_color: list.category_color,
        item_count: list.items.length,
        ranker_count: rankerSet.size,
        last_activity_at: (lastActivity ?? list.updatedAt).toISOString(),
        pinned: viewerId !== null && (list.pins?.length ?? 0) > 0,
        top_tier_items: topItems,
      };
    });

    return NextResponse.json(result);
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

    // category_icon/category_color require `prisma generate` after the migration
    await (prisma.list.create as any)({
      data: {
        title: data.title,
        description: data.description,
        tags: data.tags,
        createdById: decoded.sub,
        img: data.img,
        hidden: data.hidden,
        category_icon: ICON_NAMES_SET.has(data.category_icon)
          ? data.category_icon
          : "ti-stack-2",
        category_color: COLOR_NAMES_SET.has(data.category_color)
          ? data.category_color
          : "blue",
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

    return Response.json("Success", { status: 200 });
  } catch (e) {
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
    });

    if (!ownsList) {
      return NextResponse.json(
        { message: "Failed to update list" },
        { status: 401 }
      );
    }

    // category_icon/category_color require `prisma generate` after the migration
    await (prisma.list.update as any)({
      where: { id: data.id, createdById: user.id },
      data: {
        title: data.title,
        description: data.description,
        img: data.img,
        hidden: data.hidden,
        ...(data.category_icon && ICON_NAMES_SET.has(data.category_icon) && {
          category_icon: data.category_icon,
        }),
        ...(data.category_color && COLOR_NAMES_SET.has(data.category_color) && {
          category_color: data.category_color,
        }),
      },
    });

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (e) {
    return Response.error();
  }
}
