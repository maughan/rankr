"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useGetAnonPayoffQuery } from "@/lib/api/listsApi";
import PayoffPage from "@/app/components/payoff";

export default function AnonSubmittedPage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const isFirst = searchParams.get("first") === "1";

  const { data, isLoading, isError } = useGetAnonPayoffQuery(token);

  return (
    <PayoffPage
      data={data}
      isLoading={isLoading}
      isError={isError}
      isFirst={isFirst}
      isAnon={true}
      backHref={`/r/${token}`}
      shareToken={token}
    />
  );
}
