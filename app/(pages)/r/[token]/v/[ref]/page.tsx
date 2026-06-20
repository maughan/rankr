import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, TWITTER_HANDLE } from "@/app/siteConfig";
import { verifyVerdictRef } from "@/lib/share/verdictRef";
// Reuse the interactive shared-list experience from the parent route. This
// segment exists only so generateMetadata can read the [ref] path param
// (layouts don't receive it) and point the unfurl at the personal verdict OG.
import SharedListPage from "../../page";

type Props = { params: Promise<{ token: string; ref: string }> };

// Share links are never indexed — discovery happens via canonical /s/ URLs.
const noindex = { robots: { index: false, follow: false } } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token, ref } = await params;

  const list = (await prisma.list.findUnique({
    where: { share_token: token },
    select: { id: true, title: true, short_id: true, is_shareable: true },
  })) as {
    id: number;
    title: string;
    short_id: string;
    is_shareable: boolean;
  } | null;

  if (!list || !list.is_shareable) {
    return { title: SITE_NAME, ...noindex };
  }

  // Only honour a ref that is both valid AND bound to this list — otherwise a
  // ref from another list can't be smuggled onto this share link.
  const payload = verifyVerdictRef(ref);
  const verdictValid = payload !== null && payload.l === list.id;

  const ogImage = verdictValid
    ? `/api/og/verdict?ref=${encodeURIComponent(ref)}`
    : `/api/og/list?id=${list.short_id}`;

  const title = `${list.title} — ${SITE_NAME}`;
  const description = verdictValid
    ? `See how this ranking stacks up against the crowd on ${SITE_NAME}.`
    : `Rank ${list.title} and compare with the community on ${SITE_NAME}.`;

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

export default function SharedListVerdictPage() {
  return <SharedListPage />;
}
