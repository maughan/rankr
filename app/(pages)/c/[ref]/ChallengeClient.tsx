"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGetMyRankingQuery } from "@/lib/api/listsApi";
import { trackEvent } from "@/lib/analytics/client";
import { E } from "@/lib/analytics/events";
import type { RevealData } from "@/lib/server/reveal";

type Props = {
  invalid: boolean;
  token: string | null;
  refValue: string;
  listId: number | null;
  listTitle: string | null;
  sharerHandle: string | null;
};

export default function ChallengeClient({ invalid, token, refValue, listId, listTitle, sharerHandle }: Props) {
  const { data: myRanking } = useGetMyRankingQuery(token ?? "", { skip: !token });
  const hasRanked = !!myRanking?.tiers?.some((t) => t.items.length > 0);
  const [reveal, setReveal] = useState<RevealData | null>(null);

  useEffect(() => {
    // Log the list id, never the signed ref (a durable bearer token).
    if (!invalid && token && listId != null) {
      trackEvent(E.CHALLENGE_OPENED, { listId });
    }
  }, [invalid, token, listId]);

  useEffect(() => {
    if (!hasRanked) return;
    fetch(`/api/c/${refValue}/reveal`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setReveal(d))
      .catch(() => setReveal(null));
  }, [hasRanked, refValue]);

  if (invalid || !token) {
    return (
      <div className="z-10 bg-rk-page min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-rk-primary text-[17px] font-[500]">This challenge link is no longer valid</p>
        <Link href="/feed" className="mt-2 px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px]">Browse lists</Link>
      </div>
    );
  }

  if (!hasRanked) {
    return (
      <div className="z-10 bg-rk-page min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center max-w-md mx-auto">
        <p className="text-rk-primary text-[22px] font-[500] leading-tight">
          {sharerHandle ? `@${sharerHandle} ranked ${listTitle}.` : `Someone ranked ${listTitle}.`}
        </p>
        <p className="text-rk-secondary text-[14px]">Think you agree? Rank it blind first — then see how you stack up.</p>
        <Link
          href={`/r/${token}/s?ref=${encodeURIComponent(refValue)}`}
          onClick={() => { if (listId != null) trackEvent(E.CHALLENGE_RANK_STARTED, { listId }); }}
          className="w-full max-w-xs py-2.5 rounded-[10px] text-[14px] font-[500] bg-rk-accent text-white hover:opacity-90 transition-opacity"
        >
          Rank blind
        </Link>
        <button
          onClick={() => { if (listId != null) trackEvent(E.CHALLENGE_SKIPPED, { listId }); window.location.href = `/r/${token}`; }}
          className="text-[13px] text-rk-muted hover:text-rk-secondary transition-colors cursor-pointer"
        >
          Just show me the results
        </button>
      </div>
    );
  }

  return (
    <div className="z-10 bg-rk-page min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center max-w-md mx-auto">
      <p className="text-rk-secondary text-[13px]">{listTitle}</p>
      {reveal ? (
        <>
          <div className="flex flex-col items-center">
            <span className="text-rk-primary text-[56px] font-[500] leading-none">{reveal.vsCrowdPct}%</span>
            <span className="text-rk-secondary text-[14px] mt-1">aligned with the crowd</span>
          </div>
          {reveal.vsSharerPct !== null && (
            <p className="text-rk-muted text-[14px]">
              vs <span className="text-rk-secondary">{reveal.sharerHandle ? `@${reveal.sharerHandle}` : "the sharer"}</span>:{" "}
              <span className="text-rk-primary font-[500]">{reveal.vsSharerPct}%</span>
            </p>
          )}
          {reveal.hottestTake && (
            <p className="text-rk-muted text-[13px]">
              Hottest take: <span className="text-rk-primary font-[500]">{reveal.hottestTake.itemName}</span>{" "}
              (you: {reveal.hottestTake.yourTier} · crowd: {reveal.hottestTake.crowdMeanTier})
            </p>
          )}
        </>
      ) : (
        <p className="text-rk-muted text-[14px]">Loading your results…</p>
      )}
      <Link href={`/r/${token}/submitted`} className="w-full max-w-xs py-2.5 rounded-[10px] text-[14px] font-[500] bg-rk-accent text-white hover:opacity-90 transition-opacity">
        See full breakdown
      </Link>
      <Link href="/feed" className="text-[13px] text-rk-muted hover:text-rk-secondary transition-colors">Browse more lists</Link>
    </div>
  );
}
