"use client";

import { useEffect, useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X, Pencil } from "lucide-react";

import { useGetListQuery, useSubmitRankingsMutation } from "@/lib/api/listsApi";
import { S } from "@/app/content/strings";
import Skeleton from "@/app/components/Skeleton";
import { TierRowSkeleton } from "../skeletons";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import Draggable from "@/app/Draggable";
import Droppable from "@/app/Droppable";
import {
  getUserFromToken,
  ImageKitLoader,
  processRankingData,
} from "@/lib/helpers";
import { TierItem } from "@/app/types";
import NavAvatar from "@/app/components/NavAvatar";
import LandingFooter from "@/app/landing/LandingFooter";

// ── Tier label colours ────────────────────────────────────────────────────────

const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: "#C44545", text: "#ffffff" },
  A: { bg: "#E08C2C", text: "#2A1A04" },
  B: { bg: "#97C459", text: "#173404" },
  C: { bg: "#5DCAA5", text: "#04342C" },
  D: { bg: "#85B7EB", text: "#042C53" },
  F: { bg: "#AFA9EC", text: "#26215C" },
};

// ── Item card (matches list view) ─────────────────────────────────────────────

function ItemCard({
  item,
  isJustDropped,
}: {
  item: TierItem;
  isJustDropped?: boolean;
}) {
  const base =
    "relative w-[70px] bg-rk-surface border border-rk-stroke rounded-[8px] overflow-hidden cursor-grab active:cursor-grabbing" +
    " motion-safe:transition-[transform,border-color] motion-safe:duration-150 motion-safe:ease-out" +
    " motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.02] motion-safe:hover:border-rk-muted";
  const cls = `${base}${isJustDropped ? " rk-item-drop" : ""}`;

  if (item.img) {
    return (
      <div className={cls}>
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
    <div className={cls}>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RankClient({
  listId,
  listHref,
}: {
  listId: number;
  listHref: string;
}) {
  const router = useRouter();

  const dispatch = useAppDispatch();

  const { data: list, isLoading } = useGetListQuery(listId);
  const [submitRankings, { isLoading: isSubmitting }] =
    useSubmitRankingsMutation();

  const { rankings, modals, selectedItems, openTier, imageModalUrl } =
    useAppSelector((state) => state.ui);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setCurrentUserId] = useState(0);
  const [justDroppedId, setJustDroppedId] = useState<number | null>(null);
  const [pulsingTiers, setPulsingTiers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (list && rankings.length === 0) {
      dispatch(uiActions.startRanking(list));
    }
  }, [list]);

  useEffect(() => {
    if (!modals.auth) {
      const { id } = getUserFromToken();
      setIsLoggedIn(id > 0);
      setCurrentUserId(id);
    }
  }, [modals.auth]);

  const handleDragEnd = (event: any) => {
    const { over, active } = event;
    if (!over) return;

    const targetTier = rankings.find((t) => t.id === over.id);
    const isFirstItemInTier =
      targetTier !== undefined &&
      over.id !== -1 &&
      targetTier.items.length === 0;

    dispatch(uiActions.handleDropItem({ over: over.id, active: active.id }));

    const droppedId = active.id as number;
    setJustDroppedId(droppedId);
    const dropTimer = setTimeout(() => setJustDroppedId(null), 320);

    if (isFirstItemInTier) {
      setPulsingTiers((prev: Set<number>) => new Set([...prev, over.id]));
      setTimeout(() => {
        setPulsingTiers((prev: Set<number>) => {
          const next = new Set(prev);
          next.delete(over.id);
          return next;
        });
      }, 450);
    }

    return () => clearTimeout(dropTimer);
  };

  const handleRankSubmit = async () => {
    if (!list) return;

    try {
      const { id: userId, username } = getUserFromToken();
      const userRankings = processRankingData(
        rankings,
        { id: userId, username },
        list.id
      );

      const result = await submitRankings(userRankings).unwrap();

      dispatch(uiActions.clearRankings());
      router.push(
        `${listHref}/submitted${result.isFirstSubmit ? "?first=1" : ""}`
      );
    } catch (e) {
      console.error(e);
      toast.error(S.rankings.saveFailed);
    }
  };

  if (isLoading || !list) {
    return (
      <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto sm:pb-24">
        {/* Top bar — real chrome */}
        <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
          <div className="flex justify-between items-center h-12">
            <Link
              href={isLoggedIn ? "/s" : "/"}
              className="flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href={listHref}
                className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px]"
              >
                Back
              </Link>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-rk-accent/30">
                <Skeleton width={12} height={12} />
                <Skeleton width={44} height={11} />
              </div>
            </div>
          </div>
          <div className="flex sm:hidden items-center gap-2 pb-3 justify-between">
            <Link
              href={listHref}
              className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px]"
            >
              Back
            </Link>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-rk-accent/30">
              <Skeleton width={12} height={12} />
              <Skeleton width={44} height={11} />
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-6 flex flex-col gap-6 max-w-3xl mx-auto">
          {/* Header skeleton */}
          <div className="flex flex-col gap-2">
            <Skeleton height={20} width="50%" />
            <Skeleton height={11} width="36%" />
          </div>

          {/* Tier rows skeleton */}
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

  return (
    <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto sm:pb-24">
      <DndContext onDragEnd={handleDragEnd}>
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
          <div className="flex justify-between items-center h-12">
            <Link
              href={isLoggedIn ? "/s" : "/"}
              className="flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <NavAvatar username={getUserFromToken().username} />
              <div className="hidden sm:flex items-center justify-between gap-2">
                <Link
                  href={listHref}
                  className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
                >
                  Back
                </Link>
                <button
                  onClick={handleRankSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
                  ) : (
                    <Pencil size={12} strokeWidth={2.5} />
                  )}
                  Submit
                </button>
              </div>
            </div>
          </div>
          <div className="flex sm:hidden items-center justify-between gap-2 pb-3">
            <Link
              href={listHref}
              className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
            >
              Back
            </Link>
            <button
              onClick={handleRankSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
              ) : (
                <Pencil size={12} strokeWidth={2.5} />
              )}
              Submit
            </button>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="px-4 mx-auto sm:px-8 py-6 flex flex-col gap-6 max-w-3xl">
          {/* Header */}
          <div>
            <p
              className="text-rk-primary font-[500] leading-tight"
              style={{ fontSize: 22, letterSpacing: "-0.4px" }}
            >
              {list.title}
            </p>
            {list.description && (
              <p className="text-[12px] text-rk-muted mt-0.5">
                {list.description}
              </p>
            )}
          </div>

          {/* ── Tier rows ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-[6px]">
            {rankings.map((tier) => {
              const style = TIER_STYLE[tier.title] ?? {
                bg: tier.color,
                text: "#000000",
              };
              const tierItems = tier.items
                .map((itemId) =>
                  list.items.find((i: TierItem) => i.id === itemId)
                )
                .filter((i): i is TierItem => !!i);

              return (
                <div
                  key={tier.id}
                  className="flex border border-rk-stroke"
                  style={{ borderRadius: 10 }}
                >
                  {/* Tier label — click to open item picker */}
                  <button
                    className="w-16 flex-shrink-0 flex flex-col items-center justify-center py-3 gap-[3px] hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: style.bg,
                      minHeight: 76,
                      borderTopLeftRadius: 9,
                      borderBottomLeftRadius: 9,
                    }}
                    onClick={() => dispatch(uiActions.openTierModal(tier))}
                  >
                    <span
                      className={`text-[26px] font-[500] leading-none select-none${
                        pulsingTiers.has(tier.id) ? " rk-tier-pulse" : ""
                      }`}
                      style={{ color: style.text, display: "inline-block" }}
                    >
                      {tier.title}
                    </span>
                    <span
                      className="text-[10px] leading-none"
                      style={{ color: style.text, opacity: 0.65 }}
                    >
                      {tierItems.length}
                    </span>
                  </button>

                  {/* Droppable items area */}
                  <Droppable
                    id={tier.id}
                    className="flex flex-wrap gap-2 p-3 flex-1 min-h-[96px] content-start"
                    style={{
                      backgroundColor: "#0F1828",
                      borderTopRightRadius: 9,
                      borderBottomRightRadius: 9,
                    }}
                  >
                    {tierItems.map((item) => (
                      <Draggable key={item.id} id={item.id} url={item.img}>
                        <ItemCard
                          item={item}
                          isJustDropped={justDroppedId === item.id}
                        />
                      </Draggable>
                    ))}
                  </Droppable>
                </div>
              );
            })}
          </div>

          {/* ── Unranked pool ──────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest mb-2">
              Unranked
            </p>
            <Droppable
              id={-1}
              className="flex flex-wrap gap-2 min-h-[96px] content-start p-3"
              style={{
                borderRadius: 9,
              }}
            >
              {list.items.map((item: TierItem) => {
                const isRanked = rankings.some((tier) =>
                  tier.items.includes(item.id)
                );
                if (isRanked) return null;
                return (
                  <Draggable key={item.id} id={item.id} url={item.img}>
                    <ItemCard
                      item={item}
                      isJustDropped={justDroppedId === item.id}
                    />
                  </Draggable>
                );
              })}
            </Droppable>
          </div>
        </div>
      </DndContext>

      <LandingFooter />

      {/* ── Legacy image zoom modal ──────────────────────────────────────────── */}
      {modals.imageModal && (
        <>
          <div className="fixed inset-0 z-[998] bg-black/50" />
          <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
            <div
              className="relative rounded-[10px] overflow-hidden"
              style={{
                backgroundColor: "#142036",
                border: "1px solid #1E2C44",
              }}
            >
              <div className="relative w-full max-w-md">
                <Image
                  loader={ImageKitLoader}
                  src={imageModalUrl}
                  alt=""
                  width={400}
                  height={300}
                  className="w-full h-auto object-contain"
                />
                <button
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  onClick={() => dispatch(uiActions.closeImageModal())}
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
