import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveProfileParam } from "@/lib/server/resolveProfile";
import ProfileClient from "./ProfileClient";

type Props = { params: Promise<{ username: string }> };

const getProfile = cache(resolveProfileParam);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const result = await getProfile(username.toLowerCase());
  if (result.kind !== "found") return {};

  const { profile } = result;
  const displayName = profile.display_name ?? profile.username;
  const title = `${displayName} (@${profile.username}) — tierstack.dev`;
  const description = profile.bio ?? `${displayName}'s tier lists on tierstack.dev.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile", siteName: "tierstack.dev" },
    twitter: { card: "summary", title, description, site: "@tierstack" },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  if (username !== username.toLowerCase()) permanentRedirect(`/u/${username.toLowerCase()}`);
  const result = await getProfile(username);

  if (result.kind === "notfound") notFound();
  if (result.kind === "redirect") permanentRedirect(`/u/${result.canonicalUsername}`);

  return <ProfileClient username={result.profile.username} />;
}
