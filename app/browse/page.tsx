import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE_URL, TWITTER_HANDLE } from "@/app/siteConfig";
import { S } from "@/app/content/strings";
import { CATEGORIES } from "@/lib/categories";
import { CategoryIcon } from "@/app/components/item/CategoryIcon";
import LandingNav from "@/app/landing/LandingNav";
import { SurpriseButton } from "@/app/components/SurpriseButton";

export const revalidate = 3600;

const COPY = S.browsePage;
const PAGE_URL = `${SITE_URL}/browse`;
const MIN_ITEMS = 3;
const MIN_CATEGORY_LISTS = 3;

export const metadata: Metadata = {
  title: COPY.seoTitle,
  description: COPY.seoDescription,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: COPY.seoTitle,
    description: COPY.seoDescription,
    type: "website",
    url: PAGE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: COPY.seoTitle,
    description: COPY.seoDescription,
    site: TWITTER_HANDLE,
  },
};

async function fetchCategoryCounts(): Promise<Map<string, number>> {
  const raw = await prisma.list.findMany({
    where: { visibility: "public" },
    select: {
      category: true,
      _count: { select: { items: true } },
    },
  });

  const counts = new Map<string, number>();
  for (const l of raw) {
    if (l._count.items >= MIN_ITEMS) {
      counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    }
  }
  return counts;
}

export default async function BrowsePage() {
  const countByCategory = await fetchCategoryCounts().catch(() => new Map<string, number>());

  const tiles = CATEGORIES.map((cat) => ({
    ...cat,
    count: countByCategory.get(cat.slug) ?? 0,
  }))
    .filter((cat) => cat.count >= MIN_CATEGORY_LISTS)
    .sort((a, b) => {
      if (a.slug === "other") return 1;
      if (b.slug === "other") return -1;
      return b.count - a.count;
    });

  return (
    <div className="min-h-screen bg-rk-page flex flex-col">
      <LandingNav />

      <main className="flex-1 px-6 py-12 sm:px-10 max-w-4xl mx-auto w-full flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[36px] sm:text-[44px] font-bold text-rk-primary tracking-tight">
            {COPY.h1}
          </h1>
          <p className="text-[15px] text-rk-secondary">{COPY.subtitle}</p>
        </div>

        {tiles.length === 0 ? (
          <p className="text-[14px] text-rk-muted">{COPY.empty}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tiles.map((cat) => (
              <Link
                key={cat.slug}
                href={`/browse/${cat.slug}`}
                className="flex flex-col gap-3 rounded-[12px] p-5 border transition-colors hover:border-rk-muted group"
                style={{
                  backgroundColor: `${cat.color}10`,
                  borderColor: `${cat.color}30`,
                }}
              >
                <div style={{ color: cat.color }}>
                  <CategoryIcon slug={cat.slug} size={22} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[14px] font-[600] text-rk-primary group-hover:text-rk-accent transition-colors">
                    {cat.label}
                  </p>
                  <p className="text-[11px] text-rk-muted">
                    {cat.count} list{cat.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <SurpriseButton className="flex items-center gap-2 px-4 py-2 text-[13px] font-[500] border border-rk-stroke text-rk-secondary rounded-[8px] hover:border-rk-muted hover:text-rk-primary transition-colors cursor-pointer disabled:opacity-50" />
        </div>
      </main>
    </div>
  );
}
