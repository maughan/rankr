import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listUrl } from "@/lib/listUrl";
import { SITE_URL, TWITTER_HANDLE } from "@/app/siteConfig";
import { S } from "@/app/content/strings";
import {
  CATEGORIES,
  CATEGORY_SLUGS_SET,
  getCategoryMeta,
} from "@/lib/categories";
import { CategoryIcon } from "@/app/components/item/CategoryIcon";
import LandingNav from "@/app/(pages)/landing/LandingNav";
import { CategoryTracker } from "./CategoryTracker";

export const revalidate = 3600;

const MIN_ITEMS = 3;
const MIN_CATEGORY_LISTS = 3;

type BrowseList = {
  slug: string;
  short_id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  _count: { items: number; rankings: number };
  createdBy: { username: string };
};

async function fetchListsForCategory(category: string): Promise<BrowseList[]> {
  const raw = (await prisma.list.findMany({
    where: { visibility: "public", category },
    select: {
      slug: true,
      short_id: true,
      title: true,
      description: true,
      updatedAt: true,
      _count: { select: { items: true, rankings: true } },
      createdBy: { select: { username: true } },
    },
    orderBy: [{ rankings: { _count: "desc" } }, { updatedAt: "desc" }],
    take: 96,
  })) as BrowseList[];

  return raw.filter((l) => l._count.items >= MIN_ITEMS);
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
    (slug) => (counts.get(slug) ?? 0) >= MIN_CATEGORY_LISTS
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

function BrowseCard({ list }: { list: BrowseList }) {
  return (
    <Link
      href={listUrl(list)}
      className="flex flex-col gap-2 rounded-[12px] p-4 transition-colors group"
      style={{ backgroundColor: "#0F1828", border: "1px solid #1E2C44" }}
    >
      <p className="text-[14px] font-[600] text-rk-primary group-hover:text-rk-accent transition-colors line-clamp-1">
        {list.title}
      </p>
      {list.description && (
        <p className="text-[12px] text-rk-secondary line-clamp-2 leading-relaxed">
          {list.description}
        </p>
      )}
      <p className="text-[11px] text-rk-tertiary mt-auto pt-1">
        {list._count.rankings} ranking{list._count.rankings !== 1 ? "s" : ""} ·{" "}
        {list._count.items} item{list._count.items !== 1 ? "s" : ""}
      </p>
    </Link>
  );
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
      <LandingNav />

      <main className="flex-1 px-6 py-12 sm:px-10 max-w-6xl mx-auto w-full flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Link
            href="/browse"
            className="text-[12px] text-rk-muted hover:text-rk-secondary transition-colors flex items-center gap-1"
          >
            ← Browse
          </Link>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <BrowseCard key={list.short_id} list={list} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
