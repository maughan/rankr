import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RankClient from "@/app/(pages)/s/[id]/s/RankClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ list?: string }> };

export default async function OnboardingRankPage({ searchParams }: Props) {
  const { list } = await searchParams;
  const listId = list ? parseInt(list, 10) : NaN;

  if (!listId || isNaN(listId)) redirect("/onboarding/topic");

  return (
    <RankClient
      listId={listId}
      listHref="/onboarding/topic"
      redirectTarget="/onboarding/reveal"
      showProgress
    />
  );
}
