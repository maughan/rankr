import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveListParam } from "@/lib/server/resolveList";
import { listUrl } from "@/lib/listUrl";
import RankClient from "./RankClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function RankPage({ params }: Props) {
  const { id: param } = await params;
  const result = await resolveListParam(param);

  if (result.kind === "notfound") notFound();

  const canonical = listUrl(result.list);
  if (result.kind === "redirect") permanentRedirect(`${canonical}/s`);

  return <RankClient listId={result.list.id} listHref={canonical} />;
}
