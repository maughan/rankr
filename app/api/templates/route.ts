import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface TemplateCard {
  id: number;
  short_id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  img: string | null;
  item_count: number;
  preview: { name: string | null; color: string | null }[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const rows = (await (prisma.list as any).findMany({
    where: {
      visibility: "public",
      is_template: true,
      deleted_at: null,
      taken_down_at: null,
      ...(category ? { category } : {}),
    },
    select: {
      id: true,
      short_id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      img: true,
      items: { select: { name: true, color: true }, take: 5, orderBy: { createdAt: "asc" } },
      _count: { select: { items: true } },
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  })) as {
    id: number; short_id: string; slug: string; title: string;
    description: string | null; category: string; img: string | null;
    items: { name: string | null; color: string | null }[];
    _count: { items: number };
  }[];

  const cards: TemplateCard[] = rows.map((r) => ({
    id: r.id, short_id: r.short_id, slug: r.slug, title: r.title,
    description: r.description, category: r.category, img: r.img,
    item_count: r._count.items, preview: r.items,
  }));

  const byCategory = new Map<string, TemplateCard[]>();
  for (const c of cards) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category)!.push(c);
  }
  const grouped = [...byCategory.entries()].map(([cat, templates]) => ({ category: cat, templates }));

  return NextResponse.json(grouped, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
