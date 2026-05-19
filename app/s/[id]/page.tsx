import { cache } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveListParam } from "@/lib/server/resolveList";
import { listUrl } from "@/lib/listUrl";
import ListDetail from "./ListDetail";

type Props = { params: Promise<{ id: string }> };

// Cached so generateMetadata and the page share one DB round-trip per request
const getListMeta = cache(async (param: string) => {
  const result = await resolveListParam(param);
  if (result.kind === "notfound") return null;

  const meta = await (prisma.list as any).findUnique({
    where: { short_id: result.list.short_id },
    select: { title: true, description: true },
  }) as { title: string; description: string } | null;

  return meta ? { result, meta } : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: param } = await params;
  const resolved = await getListMeta(param);
  if (!resolved) return {};

  const { result, meta } = resolved;
  const canonical = listUrl(result.list);

  const hdr = await headers();
  const host = hdr.get("host") ?? "localhost:3000";
  const proto = hdr.get("x-forwarded-proto") ?? "http";
  const absoluteCanonical = `${proto}://${host}${canonical}`;

  const title = `${meta.title} — tierstack.dev`;
  const description = meta.description ||
    `Rank ${meta.title} and compare with the community on tierstack.dev.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteCanonical },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "tierstack.dev",
      url: absoluteCanonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
      site: "@tierstack",
    },
  };
}

export default async function ListPage({ params }: Props) {
  const { id: param } = await params;
  const result = await resolveListParam(param);

  if (result.kind === "notfound") notFound();

  const canonical = listUrl(result.list);
  if (result.kind === "redirect") permanentRedirect(canonical);

  return <ListDetail listId={result.list.id} listHref={canonical} />;
}
