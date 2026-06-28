import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE_URL, TWITTER_HANDLE } from "@/app/siteConfig";
import { S } from "@/app/content/strings";
import {
  CATEGORIES,
  CATEGORY_SLUGS_SET,
  getCategoryMeta,
} from "@/lib/categories";
import type { ListPreview } from "@/app/types";
import { CategoryIcon } from "@/app/components/item/CategoryIcon";
import ListCard from "@/app/components/list/ListCard";
import LandingNav from "@/app/(pages)/landing/LandingNav";
import { CategoryTracker } from "./CategoryTracker";
import { Logo } from "@/app/components";
import { Undo2 } from "lucide-react";

export const revalidate = 3600;

const MIN_ITEMS = 3;
const MIN_CATEGORY_LISTS = 3;

// Build the same ListPreview shape the feed/library cards consume so the
// browse grid renders identical ListCard styling (generated cover, stats,
// tier strip).
async function fetchListsForCategory(category: string): Promise<ListPreview[]> {
  const raw = (await prisma.list.findMany({
    where: { visibility: "public", category },
    select: {
      id: true,
      short_id: true,
      slug: true,
      title: true,
      description: true,
      img: true,
      visibility: true,
      category: true,
      is_template: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      createdBy: { select: { id: true, username: true } },
      tiers: { select: { title: true, value: true } },
      items: {
        select: {
          id: true,
          name: true,
          short_label: true,
          color: true,
          rankings: { select: { userId: true, value: true } },
        },
      },
    },
    orderBy: [{ rankings: { _count: "desc" } }, { updatedAt: "desc" }],
    take: 96,
  })) as any[];

  return raw
    .filter((l) => l.items.length >= MIN_ITEMS)
    .map((list) => {
      const creatorRankMap = new Map<number, number>(); // itemId → tier value
      const rankerSet = new Set<number>();
      let rankingCount = 0;

      for (const item of list.items) {
        rankingCount += item.rankings.length;
        for (const r of item.rankings) {
          rankerSet.add(r.userId);
          if (r.userId === list.createdById) {
            creatorRankMap.set(item.id, r.value);
          }
        }
      }

      const sortedTiers = [...list.tiers]
        .filter((t: any) => t.value > 0)
        .sort((a: any, b: any) => b.value - a.value);

      const topItems: ListPreview["top_tier_items"] = [];
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
        description: list.description ?? "",
        img: list.img,
        visibility: list.visibility,
        createdAt: list.createdAt.toISOString(),
        updatedAt: list.updatedAt.toISOString(),
        createdBy: list.createdBy,
        category: list.category,
        item_count: list.items.length,
        ranker_count: rankerSet.size,
        ranking_count: rankingCount,
        last_activity_at: list.updatedAt.toISOString(),
        pinned: false,
        top_tier_items: topItems,
        user_has_ranked: false,
        is_template: list.is_template,
      } as ListPreview;
    });
}

async function fetchQualifyingCategorySlugs(): Promise<string[]> {
  const raw = await prisma.list.findMany({
    where: { visibility: "public" },
    select: { category: true, _count: { select: { items: true } } },
  });

  const counts = new Map<string, number>();
  for (const l of raw) {
    if (l._count.items >= MIN_ITEMS) {
      counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    }
  }

  return CATEGORIES.map((c) => c.slug).filter(
    (slug) => (counts.get(slug) ?? 0) >= MIN_CATEGORY_LISTS,
  );
}

export async function generateStaticParams() {
  try {
    const slugs = await fetchQualifyingCategorySlugs();
    return slugs.map((category) => ({ category }));
  } catch {
    // DB unreachable at build time — pages are served on-demand via ISR
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!CATEGORY_SLUGS_SET.has(category)) return {};

  const cat = getCategoryMeta(category);
  const title = `${cat.label} Tier Lists · tierstack`;
  const description = cat.description;
  const url = `${SITE_URL}/browse/${category}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: TWITTER_HANDLE,
    },
  };
}

export default async function CategoryBrowsePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  if (!CATEGORY_SLUGS_SET.has(category)) notFound();

  const cat = getCategoryMeta(category);
  const lists = await fetchListsForCategory(category);

  return (
    <div className="min-h-screen bg-rk-page flex flex-col">
      <CategoryTracker category={category} />
      <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
        <div className="flex justify-between items-center h-12">
          <Logo />
        </div>
      </div>

      <main className="flex-1 px-6 py-12 sm:px-10 max-w-[750px] mx-auto w-full flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Link
            href="/browse"
            className="flex px-3 py-1.5 text-[13px] font-[500] items-center text-rk-secondary border border-rk-stroke rounded-[8px] w-fit"
          >
            <Undo2 size={13} />
            Back
          </Link>

          <br />

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
            >
              <CategoryIcon slug={category} size={20} />
            </div>
            <div>
              <h1 className="text-[28px] sm:text-[36px] font-bold text-rk-primary tracking-tight leading-tight">
                {cat.label}
              </h1>
              <p className="text-[13px] text-rk-secondary">{cat.description}</p>
            </div>
          </div>
        </div>

        {lists.length === 0 ? (
          <p className="text-[14px] text-rk-muted">
            {S.browsePage.categoryEmpty}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} currentUserId={0} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
