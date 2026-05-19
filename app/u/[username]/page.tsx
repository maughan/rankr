import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveProfileParam } from "@/lib/server/resolveProfile";
import { SITE_NAME, SITE_URL, TWITTER_HANDLE } from "@/app/siteConfig";
import { JsonLd } from "@/app/components/JsonLd";
import ProfileClient from "./ProfileClient";

type Props = { params: Promise<{ username: string }> };

const getProfile = cache(resolveProfileParam);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const result = await getProfile(username.toLowerCase());
  if (result.kind !== "found") return {};

  const { profile } = result;
  const displayName = profile.display_name ?? profile.username;
  const title = `${displayName} (@${profile.username}) — ${SITE_NAME}`;
  const description =
    profile.bio ?? `${displayName}'s tier lists on ${SITE_NAME}.`;
  const profileUrl = `${SITE_URL}/u/${profile.username.toLowerCase()}`;

  return {
    title,
    description,
    alternates: { canonical: profileUrl },
    openGraph: {
      title,
      description,
      type: "profile",
      url: profileUrl,
      images: [
        {
          url: `/api/og/profile?username=${profile.username}`,
          width: 1200,
          height: 675,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: TWITTER_HANDLE,
      images: [`/api/og/profile?username=${profile.username}`],
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  if (username !== username.toLowerCase())
    permanentRedirect(`/u/${username.toLowerCase()}`);

  const result = await getProfile(username);

  if (result.kind === "notfound") notFound();
  if (result.kind === "redirect")
    permanentRedirect(`/u/${result.canonicalUsername}`);

  const { profile } = result;
  const profileUrl = `${SITE_URL}/u/${profile.username.toLowerCase()}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.display_name ?? profile.username,
    alternateName: profile.username,
    url: profileUrl,
    ...(profile.bio ? { description: profile.bio } : {}),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProfileClient username={profile.username} />
    </>
  );
}
