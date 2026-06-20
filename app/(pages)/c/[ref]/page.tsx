import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, TWITTER_HANDLE } from "@/app/siteConfig";
import { verifyVerdictRef } from "@/lib/share/verdictRef";
import ChallengeClient from "./ChallengeClient";

type Props = { params: Promise<{ ref: string }> };

const noindex = { robots: { index: false, follow: false } } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ref } = await params;
  const payload = verifyVerdictRef(ref);
  if (!payload) return { title: SITE_NAME, ...noindex };

  const list = (await prisma.list.findUnique({
    where: { id: payload.l },
    select: { title: true, visibility: true, is_shareable: true },
  })) as unknown as { title: string; visibility: string; is_shareable: boolean } | null;
  if (!list || list.visibility !== "public" || !list.is_shareable) {
    return { title: SITE_NAME, ...noindex };
  }

  const title = `${list.title} — ${SITE_NAME}`;
  const description = `Rank ${list.title} blind, then see how you compare on ${SITE_NAME}.`;
  const ogImage = `/api/og/verdict?ref=${encodeURIComponent(ref)}`;

  return {
    title,
    description,
    ...noindex,
    openGraph: { title, description, type: "website", images: [{ url: ogImage, width: 1200, height: 675 }] },
    twitter: { card: "summary_large_image", title, description, site: TWITTER_HANDLE, images: [ogImage] },
  };
}

export default async function ChallengePage({ params }: Props) {
  const { ref } = await params;
  const payload = verifyVerdictRef(ref);

  if (!payload) {
    return <ChallengeClient invalid token={null} refValue={ref} listId={null} listTitle={null} sharerHandle={null} />;
  }

  const list = (await prisma.list.findUnique({
    where: { id: payload.l },
    select: {
      title: true,
      visibility: true,
      is_shareable: true,
      share_token: true,
      createdById: true,
      createdBy: { select: { username: true, display_name: true } },
    },
  })) as unknown as {
    title: string;
    visibility: string;
    is_shareable: boolean;
    share_token: string | null;
    createdById: number;
    createdBy: { username: string; display_name: string | null };
  } | null;

  if (!list || list.visibility !== "public" || !list.is_shareable || !list.share_token) {
    return <ChallengeClient invalid token={null} refValue={ref} listId={null} listTitle={null} sharerHandle={null} />;
  }

  let sharerHandle: string | null = null;
  if (payload.i.k === "user") {
    if (payload.i.id === list.createdById) {
      sharerHandle = list.createdBy.display_name ?? list.createdBy.username;
    } else {
      const u = (await prisma.user.findUnique({
        where: { id: payload.i.id },
        select: { username: true, display_name: true },
      })) as unknown as { username: string; display_name: string | null } | null;
      sharerHandle = u ? u.display_name ?? u.username : null;
    }
  }

  return (
    <ChallengeClient
      invalid={false}
      token={list.share_token}
      refValue={ref}
      listId={payload.l}
      listTitle={list.title}
      sharerHandle={sharerHandle}
    />
  );
}
