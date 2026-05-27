import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { listUrl } from "@/lib/listUrl";
import { SITE_URL } from "./siteConfig";
import { CATEGORIES } from "@/lib/categories";

const MIN_ITEMS = 3;
const MIN_RANKINGS = 1;
const MIN_CATEGORY_LISTS = 3;

const LANDING_PAGES: MetadataRoute.Sitemap = [
  { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
  { url: `${SITE_URL}/tier-list-maker`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${SITE_URL}/browse`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [rawLists, rawUsers] = await Promise.all([
      (prisma.list as any).findMany({
        where: { visibility: "public" },
        select: {
          short_id: true,
          slug: true,
          updatedAt: true,
          category: true,
          _count: { select: { items: true, rankings: true } },
        },
        orderBy: { updatedAt: "desc" },
      }) as Promise<
        {
          short_id: string;
          slug: string;
          updatedAt: Date;
          category: string;
          _count: { items: number; rankings: number };
        }[]
      >,
      (prisma.user as any).findMany({
        where: { lists: { some: { visibility: "public" } } },
        select: { username: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }) as Promise<{ username: string; createdAt: Date }[]>,
    ]);

    const lists = rawLists.filter(
      (l) => l._count.items >= MIN_ITEMS && l._count.rankings >= MIN_RANKINGS
    );

    const categoryItemCounts = new Map<string, number>();
    for (const l of rawLists) {
      if (l._count.items >= MIN_ITEMS) {
        categoryItemCounts.set(l.category, (categoryItemCounts.get(l.category) ?? 0) + 1);
      }
    }
    const qualifyingCategorySlugs = CATEGORIES.map((c) => c.slug).filter(
      (slug) => (categoryItemCounts.get(slug) ?? 0) >= MIN_CATEGORY_LISTS
    );

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

    const categoryEntries: MetadataRoute.Sitemap = qualifyingCategorySlugs.map((slug) => ({
      url: `${SITE_URL}/browse/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...LANDING_PAGES, ...categoryEntries, ...listEntries, ...profileEntries];
  } catch {
    // DB unreachable at build time — return static pages only
    return LANDING_PAGES;
  }
}
