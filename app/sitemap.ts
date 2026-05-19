import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { listUrl } from "@/lib/listUrl";
import { SITE_URL } from "./siteConfig";

const MIN_ITEMS = 3;
const MIN_RANKINGS = 1;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [rawLists, rawUsers] = await Promise.all([
    (prisma.list as any).findMany({
      where: { visibility: "public" },
      select: {
        short_id: true,
        slug: true,
        updatedAt: true,
        _count: { select: { items: true, rankings: true } },
      },
      orderBy: { updatedAt: "desc" },
    }) as Promise<
      {
        short_id: string;
        slug: string;
        updatedAt: Date;
        _count: { items: number; rankings: number };
      }[]
    >,

    (prisma.user as any).findMany({
      where: { lists: { some: { visibility: "public" } } },
      select: { username: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }) as Promise<{ username: string; createdAt: Date }[]>,
  ]);

  // Filter thin-content lists — skip empty / stub / zero-engagement lists
  const lists = rawLists.filter(
    (l) => l._count.items >= MIN_ITEMS && l._count.rankings >= MIN_RANKINGS
  );

  const landing: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  const listEntries: MetadataRoute.Sitemap = lists.map((list) => ({
    url: `${SITE_URL}${listUrl(list)}`,
    lastModified: list.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const profileEntries: MetadataRoute.Sitemap = rawUsers.map((user) => ({
    url: `${SITE_URL}/u/${user.username.toLowerCase()}`,
    lastModified: user.createdAt,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  return [...landing, ...listEntries, ...profileEntries];
}
