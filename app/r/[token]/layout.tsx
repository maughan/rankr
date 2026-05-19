import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, TWITTER_HANDLE } from "@/app/siteConfig";

type Props = {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;

  const list = await (prisma.list as any).findUnique({
    where: { share_token: token },
    select: {
      title: true,
      description: true,
      short_id: true,
      is_shareable: true,
      createdBy: { select: { username: true } },
    },
  }) as {
    title: string;
    description: string | null;
    short_id: string;
    is_shareable: boolean;
    createdBy: { username: string };
  } | null;

  // Shared links are never indexed — discovery happens via canonical /s/ URLs.
  const noindex = { robots: { index: false, follow: false } };

  if (!list || !list.is_shareable) {
    return { title: SITE_NAME, ...noindex };
  }

  const title = `${list.title} — ${SITE_NAME}`;
  const description =
    list.description ||
    `Rank ${list.title} and compare with the community on ${SITE_NAME}.`;

  // OG image reuses the public list endpoint — works without viewer session.
  const ogImage = `/api/og/list?id=${list.short_id}`;

  return {
    title,
    description,
    ...noindex,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 675 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: TWITTER_HANDLE,
      images: [ogImage],
    },
  };
}

export default function SharedListLayout({ children }: Props) {
  return <>{children}</>;
}
