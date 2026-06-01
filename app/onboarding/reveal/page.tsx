import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RevealClient from "./RevealClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ list?: string; first?: string }> };

export default async function OnboardingRevealPage({ searchParams }: Props) {
  const { list, first } = await searchParams;
  const listId = list ? parseInt(list, 10) : NaN;

  if (!listId || isNaN(listId)) redirect("/onboarding/topic");

  return <RevealClient listId={listId} isFirst={first === "1"} />;
}
