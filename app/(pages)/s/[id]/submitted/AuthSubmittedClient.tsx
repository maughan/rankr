"use client";

import { useGetPayoffQuery } from "@/lib/api/listsApi";
import PayoffPage from "@/app/components/payoff";

interface Props {
  listId: number;
  listHref: string;
  isFirst: boolean;
}

export default function AuthSubmittedClient({ listId, listHref, isFirst }: Props) {
  const { data, isLoading, isError } = useGetPayoffQuery(listId);

  return (
    <PayoffPage
      data={data}
      isLoading={isLoading}
      isError={isError}
      isFirst={isFirst}
      isAnon={false}
      backHref={listHref}
      listId={listId}
    />
  );
}
