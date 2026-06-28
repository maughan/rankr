import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL, TWITTER_HANDLE } from "@/app/siteConfig";
import TemplatesNav from "./TemplatesNav";
import type { TemplateCard } from "@/app/api/templates/route";
import TemplatesClient from "./TemplatesClient";

// Always reflect the DB — the curated catalog changes rarely but must show
// newly-seeded templates immediately (no stale fetch cache).
export const dynamic = "force-dynamic";

const SEO_TITLE = "Start from a template — tierstack.dev";
const SEO_DESCRIPTION =
  "Browse ready-made tier list templates and start ranking in one click. Pick a template, make it yours, and share your rankings.";
const PAGE_URL = `${SITE_URL}/templates`;

export const metadata: Metadata = {
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    type: "website",
    url: PAGE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    site: TWITTER_HANDLE,
  },
};

type TemplateGroup = { category: string; templates: TemplateCard[] };

// Query the DB directly — no self-fetch, no fetch cache, no silent [] on error.
async function getTemplateGroups(): Promise<TemplateGroup[]> {
  const rows = (await (prisma.list as any).findMany({
    where: {
      visibility: "public",
      is_template: true,
      deleted_at: null,
      taken_down_at: null,
    },
    select: {
      id: true,
      short_id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      img: true,
      items: {
        select: { name: true, color: true },
        take: 5,
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { items: true } },
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  })) as {
    id: number;
    short_id: string;
    slug: string;
    title: string;
    description: string | null;
    category: string;
    img: string | null;
    items: { name: string | null; color: string | null }[];
    _count: { items: number };
  }[];

  const cards: TemplateCard[] = rows.map((r) => ({
    id: r.id,
    short_id: r.short_id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    category: r.category,
    img: r.img,
    item_count: r._count.items,
    preview: r.items,
  }));

  const byCategory = new Map<string, TemplateCard[]>();
  for (const c of cards) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category)!.push(c);
  }
  return [...byCategory.entries()].map(([category, templates]) => ({
    category,
    templates,
  }));
}

export default async function TemplatesPage() {
  const groups = await getTemplateGroups();

  return (
    <div className="min-h-screen bg-rk-page flex flex-col">
      <TemplatesNav />

      <main className="flex-1 px-6 py-12 sm:px-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[36px] sm:text-[44px] font-bold text-rk-primary tracking-tight">
            Start from a template
          </h1>
          <p className="text-[15px] text-rk-secondary">
            Pick a ready-made list, make it your own, and start ranking.
          </p>
        </div>

        <TemplatesClient groups={groups} />
      </main>
    </div>
  );
}
