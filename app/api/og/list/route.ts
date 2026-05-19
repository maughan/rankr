import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getFontConfig } from "@/lib/share/font";
import { ogListCard } from "@/lib/share/templates/og-list";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shortId = searchParams.get("id");
  if (!shortId) return new Response("Missing id", { status: 400 });

  const list = await (prisma.list as any).findFirst({
    where: { short_id: shortId, visibility: "public" },
    select: {
      title: true,
      description: true,
      createdBy: { select: { username: true, display_name: true } },
      _count: { select: { items: true, rankings: true } },
      items: {
        select: { color: true },
        take: 12,
        orderBy: { createdAt: "asc" },
      },
    },
  }) as {
    title: string;
    description: string | null;
    createdBy: { username: string; display_name: string | null };
    _count: { items: number; rankings: number };
    items: { color: string | null }[];
  } | null;

  if (!list) return new Response("Not found", { status: 404 });

  const fonts = await getFontConfig();
  const element = ogListCard({
    title: list.title,
    description: list.description,
    creator: list.createdBy.display_name ?? list.createdBy.username,
    itemCount: list._count.items,
    rankerCount: list._count.rankings,
    colors: list.items.map((i) => i.color),
  });

  const image = new ImageResponse(element, { width: 1200, height: 675, fonts });

  return new Response(image.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
