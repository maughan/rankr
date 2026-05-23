import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listUrl } from "@/lib/listUrl";
import { SITE_URL, TWITTER_HANDLE } from "@/app/siteConfig";
import { S } from "@/app/content/strings";
import LandingNav from "@/app/landing/LandingNav";

export const revalidate = 3600;

const COPY = S.browsePage;
const PAGE_URL = `${SITE_URL}/browse`;
const MIN_ITEMS = 3;
const MIN_RANKINGS = 1;

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

type BrowseList = {
  slug: string;
  short_id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  _count: { items: number; rankings: number };
  createdBy: { username: string };
};

async function fetchPublicLists(): Promise<BrowseList[]> {
  const raw = await (prisma.list as any).findMany({
    where: { visibility: "public" },
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
  });

  return (raw as BrowseList[]).filter(
    (l) => l._count.items >= MIN_ITEMS && l._count.rankings >= MIN_RANKINGS
  );
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

export default async function BrowsePage() {
  const lists = await fetchPublicLists();

  return (
    <div className="min-h-screen bg-rk-page flex flex-col">
      <LandingNav />

      <main className="flex-1 px-6 py-12 sm:px-10 max-w-6xl mx-auto w-full flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[36px] sm:text-[44px] font-bold text-rk-primary tracking-tight">
            {COPY.h1}
          </h1>
          <p className="text-[15px] text-rk-secondary">{COPY.subtitle}</p>
        </div>

        {lists.length === 0 ? (
          <p className="text-[14px] text-rk-muted">{COPY.empty}</p>
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
