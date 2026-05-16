import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

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
      is_shareable: true,
      createdBy: { select: { username: true } },
    },
  });

  if (!list || !list.is_shareable) {
    return { title: "TierStack" };
  }

  const title = `${list.title} — TierStack`;
  const description = list.description
    ? list.description
    : `Rank ${list.title} and compare with the community on TierStack.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "TierStack",
    },
    twitter: {
      card: "summary",
      title,
      description,
      site: "@tierstack",
    },
  };
}

export default function SharedListLayout({ children }: Props) {
  return <>{children}</>;
}
