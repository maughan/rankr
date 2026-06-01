import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, TWITTER_HANDLE } from "@/app/siteConfig";
import { captureServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";
import { getAuthedViewer } from "@/lib/server/auth";
import { cookies } from "next/headers";

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

export default async function SharedListLayout({ children, params }: Props) {
  // Fire shared_link_visited server-side — ground truth for the viral loop.
  // Errors are swallowed so analytics never block rendering.
  try {
    const { token } = await params;
    const [list, viewer] = await Promise.all([
      (prisma.list as any).findUnique({
        where: { share_token: token },
        select: { id: true, createdById: true, is_shareable: true },
      }) as Promise<{ id: number; createdById: number; is_shareable: boolean } | null>,
      getAuthedViewer(),
    ]);

    if (list?.is_shareable) {
      const biscuits = await cookies();
      const anonSession = biscuits.get("rankr_anon_session")?.value;
      const distinctId = viewer
        ? String(viewer.id)
        : (anonSession ?? `anon_share_${token}`);

      // is_first_visit: authed users who have no prior rankings for this list
      let isFirstVisit = !viewer; // anon visitors always count as first-time
      if (viewer) {
        const existing = await prisma.ranking.findFirst({
          where: { listId: list.id, userId: viewer.id },
          select: { id: true },
        });
        isFirstVisit = !existing;
      }

      await captureServer(distinctId, E.SHARED_LINK_VISITED, {
        ref_list_id: list.id,
        ref_user_id: list.createdById,
        is_first_visit: isFirstVisit,
        viewer_logged_in: !!viewer,
      });

      // Attribution cookie — lets signup and first-ranking routes fire
      // shared_link_visitor_* without needing to re-query the share token.
      // Only set on first visit (or for anonymous visitors) to avoid
      // overwriting a higher-value attribution with a repeat visit.
      if (isFirstVisit) {
        biscuits.set({
          name: "rankr_share_ref",
          value: JSON.stringify({
            listId: list.id,
            refUserId: list.createdById,
            visitedAt: new Date().toISOString(),
          }),
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
      }
    }
  } catch {
    // analytics must never break rendering
  }

  return <>{children}</>;
}
