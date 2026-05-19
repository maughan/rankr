import { notFound, permanentRedirect } from "next/navigation";
import { resolveListParam } from "@/lib/server/resolveList";
import { listUrl } from "@/lib/listUrl";
import AuthSubmittedClient from "./AuthSubmittedClient";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ first?: string }>;
};

export default async function SubmittedPage({ params, searchParams }: Props) {
  const { id: param } = await params;
  const { first } = await searchParams;
  const result = await resolveListParam(param);

  if (result.kind === "notfound") notFound();

  const canonical = listUrl(result.list);
  if (result.kind === "redirect") {
    permanentRedirect(
      `${canonical}/submitted${first === "1" ? "?first=1" : ""}`
    );
  }

  return (
    <AuthSubmittedClient
      listId={result.list.id}
      listHref={canonical}
      isFirst={first === "1"}
    />
  );
}
