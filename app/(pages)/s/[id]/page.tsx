import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prisma } from "@/lib/prisma";
import { resolveListParam } from "@/lib/server/resolveList";
import { listUrl } from "@/lib/listUrl";
import { getServerQueryClient } from "@/lib/query/client";
import { processResponseData } from "@/lib/helpers";
import { SITE_NAME, SITE_URL, TWITTER_HANDLE } from "@/app/siteConfig";
import { JsonLd } from "@/app/components/JsonLd";
import ListDetail from "./ListDetail";

// Pre-render the 100 most recently active public lists at build time.
// All other lists fall through to on-demand rendering.
export async function generateStaticParams() {
  try {
    const lists = (await (prisma.list as any).findMany({
      where: { visibility: "public" },
      select: { short_id: true, slug: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    })) as { short_id: string; slug: string }[];

    return lists.map((list) => ({ id: `${list.slug}-${list.short_id}` }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ id: string }> };

interface ListMeta {
  title: string;
  description: string;
  visibility: string;
  short_id: string;
  createdBy: { username: string; display_name: string | null };
  _count: { items: number; rankings: number };
  items: { id: number; name: string | null }[];
}

// Cached — generateMetadata and the page share one DB round-trip per request.
const getListMeta = cache(async (param: string) => {
  const result = await resolveListParam(param);
  if (result.kind === "notfound") return null;

  const list = (await (prisma.list as any).findUnique({
    where: { short_id: result.list.short_id },
    select: {
      title: true,
      description: true,
      visibility: true,
      short_id: true,
      createdBy: { select: { username: true, display_name: true } },
      _count: { select: { items: true, rankings: true } },
      items: {
        select: { id: true, name: true },
        take: 20,
        orderBy: { createdAt: "asc" },
      },
    },
  })) as ListMeta | null;

  return list ? { result, list } : null;
});

// Full list payload for server-side hydration of the community tier grid.
// Mirrors the include in GET /api/s/[id] so the dehydrated cache entry is
// identical to what the client query would fetch — no refetch, no mismatch.
const getListFull = cache(async (listId: number) => {
  return (await prisma.list.findUnique({
    where: { id: listId },
    include: {
      items: {
        include: {
          rankings: {
            include: { user: { select: { id: true, username: true } } },
          },
        },
      },
      createdBy: { select: { id: true, username: true } },
      tiers: true,
    },
  })) as unknown;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: param } = await params;
  const resolved = await getListMeta(param);
  if (!resolved) return {};

  const { result, list } = resolved;
  const isPublic = list.visibility === "public";
  const canonical = `${SITE_URL}${listUrl(result.list)}`;

  const title = `${list.title} — ${SITE_NAME}`;
  const description =
    list.description ||
    `${list._count.items} items ranked S to F. ${list._count.rankings} people have submitted rankings. Compare yours.`;

  return {
    title,
    description,
    robots: { index: isPublic, follow: isPublic },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: isPublic
        ? [
            {
              url: `/api/og/list?id=${list.short_id}`,
              width: 1200,
              height: 675,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: TWITTER_HANDLE,
      images: isPublic ? [`/api/og/list?id=${list.short_id}`] : undefined,
    },
  };
}

export default async function ListPage({ params }: Props) {
  const { id: param } = await params;
  const resolved = await getListMeta(param);

  if (!resolved) notFound();

  const { result, list } = resolved;
  const canonical = listUrl(result.list);

  if (result.kind === "redirect") permanentRedirect(canonical);

  const absoluteCanonical = `${SITE_URL}${canonical}`;
  const creator = list.createdBy.display_name ?? list.createdBy.username;
  const profileUrl = `${SITE_URL}/u/${list.createdBy.username.toLowerCase()}`;

  const jsonLd =
    list.visibility === "public"
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: list.title,
          description: list.description || undefined,
          url: absoluteCanonical,
          numberOfItems: list._count.items,
          author: {
            "@type": "Person",
            name: creator,
            url: profileUrl,
          },
          itemListElement: list.items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name ?? "Unknown",
          })),
        }
      : null;

  // Hydrate the community tier grid server-side for public lists only.
  // Public lists expose the same ranking data to every viewer, so the
  // anonymous payload matches what any signed-in user would fetch — and we
  // avoid cookies()/per-viewer logic, keeping the route statically prerendered.
  let dehydratedState: ReturnType<typeof dehydrate> | null = null;
  if (list.visibility === "public") {
    const full = await getListFull(result.list.id);
    if (full) {
      const processed = processResponseData([
        JSON.parse(JSON.stringify(full)),
      ] as never)[0];
      const qc = getServerQueryClient();
      qc.setQueryData(["list", result.list.id], processed);
      dehydratedState = dehydrate(qc);
    }
  }

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {dehydratedState ? (
        <HydrationBoundary state={dehydratedState}>
          <ListDetail listId={result.list.id} listHref={canonical} />
        </HydrationBoundary>
      ) : (
        <ListDetail listId={result.list.id} listHref={canonical} />
      )}
    </>
  );
}
