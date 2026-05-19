import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { listUrl } from "@/lib/listUrl";

const ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://tierstack.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lists = await (prisma.list as any).findMany({
    where: { visibility: "public" },
    select: { short_id: true, slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  }) as { short_id: string; slug: string; updatedAt: Date }[];

  return lists.map((list) => ({
    url: `${ORIGIN}${listUrl(list)}`,
    lastModified: list.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}
