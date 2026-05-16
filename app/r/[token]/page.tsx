"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Users } from "lucide-react";

import { useState } from "react";
import {
  useGetSharedListQuery,
  useGetMyRankingQuery,
  useGetCreatorRankingQuery,
  SharedListItem,
} from "@/lib/api/listsApi";
import Skeleton from "@/app/components/Skeleton";
import { TierRowSkeleton } from "@/app/s/[id]/skeletons";
import AnonComparison from "@/app/components/anonComparison";
import { ImageKitLoader } from "@/lib/helpers";

const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: "#C44545", text: "#ffffff" },
  A: { bg: "#E08C2C", text: "#2A1A04" },
  B: { bg: "#97C459", text: "#173404" },
  C: { bg: "#5DCAA5", text: "#04342C" },
  D: { bg: "#85B7EB", text: "#042C53" },
  F: { bg: "#AFA9EC", text: "#26215C" },
};

function ItemCard({ item }: { item: SharedListItem }) {
  const base =
    "w-[70px] bg-rk-surface border border-rk-stroke rounded-[8px] overflow-hidden cursor-default";

  if (item.img) {
    return (
      <div className={base}>
        <div className="relative h-[44px]">
          <Image
            loader={ImageKitLoader}
            src={item.img}
            alt=""
            fill
            sizes="70px"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="px-1.5 py-1.5">
          <p className="text-[11px] text-rk-secondary leading-tight truncate">
            {item.name ?? "—"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={base}>
      <div
        className="h-[44px] flex items-center justify-center rounded-t-[6px]"
        style={{ backgroundColor: item.color ?? "#334155" }}
      >
        <span className="text-white text-[11px] font-[500] select-none">
          {item.short_label}
        </span>
      </div>
      <div className="px-1.5 py-1.5">
        <p className="text-[11px] text-rk-secondary leading-tight truncate">
          {item.name}
        </p>
      </div>
    </div>
  );
}

export default function SharedListPage() {
  const { token } = useParams<{ token: string }>();
  const {
    data: list,
    isLoading,
    isFetching,
    isError,
  } = useGetSharedListQuery(token, {
    refetchOnMountOrArgChange: true,
  });
  const { data: myRanking } = useGetMyRankingQuery(token, {
    refetchOnMountOrArgChange: true,
  });
  const { data: creatorRanking } = useGetCreatorRankingQuery(token, {
    refetchOnMountOrArgChange: true,
  });
  const [viewMode, setViewMode] = useState<"community" | "mine">("community");

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading || isFetching) {
    return (
      <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto">
        <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/s"
                className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px]"
              >
                Browse lists
              </Link>
            </div>
          </div>
          <div className="flex sm:hidden items-center gap-2 pb-3">
            <Link
              href="/s"
              className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px]"
            >
              Browse lists
            </Link>
          </div>
        </div>
        <div className="px-4 sm:px-8 py-6 flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex flex-col gap-2">
            <Skeleton height={20} width="55%" />
            <Skeleton height={11} width="38%" />
          </div>
          <div className="flex flex-col gap-[6px]">
            <TierRowSkeleton tier="S" count={2} />
            <TierRowSkeleton tier="A" count={3} />
            <TierRowSkeleton tier="B" count={4} />
            <TierRowSkeleton tier="C" count={3} />
            <TierRowSkeleton tier="D" count={2} />
            <TierRowSkeleton tier="F" count={1} />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found / not shareable ────────────────────────────────────────────
  if (isError || !list) {
    return (
      <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto">
        <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/s"
                className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px]"
              >
                Browse lists
              </Link>
            </div>
          </div>
          <div className="flex sm:hidden items-center gap-2 pb-3">
            <Link
              href="/s"
              className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px]"
            >
              Browse lists
            </Link>
          </div>
        </div>
        <div className="px-4 sm:px-8 py-16 max-w-3xl mx-auto flex flex-col items-center gap-3 text-center">
          <p className="text-rk-primary text-[17px] font-[500]">
            Link not found
          </p>
          <p className="text-[13px] text-rk-muted">
            This share link may have been disabled or rotated.
          </p>
          <Link
            href="/s"
            className="mt-2 px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
          >
            Browse lists
          </Link>
        </div>
      </div>
    );
  }

  // ── Loaded ────────────────────────────────────────────────────────────────
  const hasMyRanking = !!myRanking?.tiers?.some((t) => t.items.length > 0);
  const activeTiers =
    viewMode === "mine" && myRanking ? myRanking.tiers : list.tiers;

  const rankedIds = new Set(activeTiers.flatMap((t) => t.items));
  const unranked = list.items.filter((item) => !rankedIds.has(item.id));

  return (
    <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
            <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
              tierstack.dev
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/s"
              className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
            >
              Browse lists
            </Link>
            {list.anonymous_rankings_enabled && (
              <Link
                href={`/r/${token}/rank`}
                className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
              >
                Rank this list
              </Link>
            )}
          </div>
        </div>
        <div className="flex sm:hidden items-center gap-2 pb-3">
          <Link
            href="/s"
            className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
          >
            Browse lists
          </Link>
          {list.anonymous_rankings_enabled && (
            <Link
              href={`/r/${token}/rank`}
              className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
            >
              Rank this list
            </Link>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-8 py-6 flex flex-col gap-6 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <p
            className="text-rk-primary font-[500] leading-tight"
            style={{ fontSize: 22, letterSpacing: "-0.4px" }}
          >
            {list.title}
          </p>
          {list.description && (
            <p className="text-[12px] text-rk-muted mt-0.5 leading-snug">
              {list.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[11px] text-rk-tertiary">
              by {list.createdBy.username}
            </span>
            {list.ranker_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-rk-tertiary">
                <Users size={11} />
                {list.ranker_count} ranking
                {list.ranker_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* View filter — only shown once the user has submitted a ranking */}
          {hasMyRanking && (
            <div
              className="flex gap-1 mt-3 p-1 rounded-[8px] self-start w-fit"
              style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
            >
              {(["community", "mine"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-[12px] font-[500] rounded-[6px] transition-colors cursor-pointer ${
                    viewMode === mode
                      ? "bg-rk-surface text-rk-primary"
                      : "text-rk-muted hover:text-rk-secondary"
                  }`}
                >
                  {mode === "community" ? "Community" : "Your ranking"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tier rows */}
        <div className="flex flex-col gap-[6px]">
          {activeTiers.map((tier) => {
            if (tier.value === 0) return null;

            const style = TIER_STYLE[tier.title] ?? {
              bg: tier.color,
              text: "#000000",
            };
            const tierItems = tier.items
              .map((id) => list.items.find((i) => i.id === id))
              .filter((i): i is SharedListItem => !!i);

            return (
              <div
                key={tier.id}
                className="flex overflow-hidden border border-rk-stroke"
                style={{ borderRadius: 10 }}
              >
                <div
                  className="w-16 flex-shrink-0 flex flex-col items-center justify-center py-3 gap-[3px]"
                  style={{ backgroundColor: style.bg, minHeight: 76 }}
                >
                  <span
                    className="text-[26px] font-[500] leading-none select-none"
                    style={{ color: style.text }}
                  >
                    {tier.title}
                  </span>
                  <span
                    className="text-[10px] leading-none"
                    style={{ color: style.text, opacity: 0.65 }}
                  >
                    {tierItems.length}
                  </span>
                </div>
                <div
                  className="flex flex-wrap gap-2 p-3 flex-1 min-h-[76px] content-start"
                  style={{ backgroundColor: "#0F1828" }}
                >
                  {tierItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Unranked */}
        {unranked.length > 0 && (
          <div>
            <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest mb-2">
              Unranked
            </p>
            <div className="flex flex-wrap gap-2">
              {unranked.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* CTA — "rank" prompt before they've submitted; "re-rank" link after */}
        {list.anonymous_rankings_enabled && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-[10px] border border-rk-stroke"
            style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-[13px] text-rk-muted">
              {hasMyRanking
                ? "Want to update your ranking?"
                : "Where would you put them?"}
            </p>
            <Link
              href={`/r/${token}/rank`}
              className="px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity flex-shrink-0"
            >
              {hasMyRanking ? "Re-rank" : "Rank this list"}
            </Link>
          </div>
        )}

        {/* Comparison matrix — shown once the user has submitted rankings */}
        {hasMyRanking && myRanking && (
          <div className="pt-2 border-t border-rk-stroke">
            <AnonComparison
              items={list.items}
              myTiers={myRanking.tiers}
              communityTiers={list.tiers}
              creatorTiers={creatorRanking?.tiers ?? null}
              creatorName={list.createdBy.username}
            />
          </div>
        )}
      </div>
    </div>
  );
}
