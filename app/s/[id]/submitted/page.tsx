"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useGetPayoffQuery } from "@/lib/api/listsApi";
import PayoffPage from "@/app/components/payoff";

export default function AuthSubmittedPage() {
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);
  const searchParams = useSearchParams();
  const isFirst = searchParams.get("first") === "1";

  const { data, isLoading, isError } = useGetPayoffQuery(listId);

  return (
    <PayoffPage
      data={data}
      isLoading={isLoading}
      isError={isError}
      isFirst={isFirst}
      isAnon={false}
      backHref={`/s/${id}`}
      listId={listId}
    />
  );
}
