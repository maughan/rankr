"use client";

import { useEffect, useRef } from "react";
import { useGetPayoffQuery } from "@/lib/api/listsApi";
import PayoffPage from "@/app/components/payoff";
import { trackEvent } from "@/lib/analytics/client";
import { E } from "@/lib/analytics/events";

interface Props {
  listId: number;
  isFirst: boolean;
}

export default function RevealClient({ listId, isFirst }: Props) {
  const { data, isLoading, isError } = useGetPayoffQuery(listId);
  const completedRef = useRef(false);

  useEffect(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Mark onboarding complete and fire analytics in parallel.
    fetch("/api/onboarding/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "completed", list_id: listId }),
    }).catch(() => {/* best-effort */});

    trackEvent(E.ONBOARDING_REVEAL_VIEWED);
  }, [listId]);

  return (
    <PayoffPage
      data={data}
      isLoading={isLoading}
      isError={isError}
      isFirst={isFirst}
      isAnon={false}
      backHref="/feed"
      listId={listId}
      onboardingMode
      archetypeHint={data?.archetypeHint}
    />
  );
}
