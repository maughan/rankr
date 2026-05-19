import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { listUrl } from "@/lib/listUrl";

const ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://tierstack.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [lists, users] = await Promise.all([
    (prisma.list as any).findMany({
      where: { visibility: "public" },
      select: { short_id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }) as Promise<{ short_id: string; slug: string; updatedAt: Date }[]>,

    // Only include profiles that have at least one public list
    (prisma.user as any).findMany({
      where: { lists: { some: { visibility: "public" } } },
      select: { username: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }) as Promise<{ username: string; createdAt: Date }[]>,
  ]);

  const listEntries: MetadataRoute.Sitemap = lists.map((list) => ({
    url: `${ORIGIN}${listUrl(list)}`,
    lastModified: list.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const profileEntries: MetadataRoute.Sitemap = users.map((user) => ({
    url: `${ORIGIN}/u/${user.username}`,
    lastModified: user.createdAt,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...listEntries, ...profileEntries];
}
