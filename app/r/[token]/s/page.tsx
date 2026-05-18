"use client";

import { useState, useCallback } from "react";
import { DndContext } from "@dnd-kit/core";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Pencil } from "lucide-react";

import { useGetSharedListQuery, SharedListItem } from "@/lib/api/listsApi";
import { S } from "@/app/content/strings";
import Skeleton from "@/app/components/Skeleton";
import { TierRowSkeleton } from "@/app/s/[id]/skeletons";
import Draggable from "@/app/Draggable";
import Droppable from "@/app/Droppable";
import { ImageKitLoader } from "@/lib/helpers";

const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: "#C44545", text: "#ffffff" },
  A: { bg: "#E08C2C", text: "#2A1A04" },
  B: { bg: "#97C459", text: "#173404" },
  C: { bg: "#5DCAA5", text: "#04342C" },
  D: { bg: "#85B7EB", text: "#042C53" },
  F: { bg: "#AFA9EC", text: "#26215C" },
};

function ItemCard({
  item,
  isJustDropped,
}: {
  item: SharedListItem;
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

export default function AnonRankPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const { data: list, isLoading, isError } = useGetSharedListQuery(token);

  // tierId → itemId[] — starts empty (all items unranked)
  const [tierItems, setTierItems] = useState<Record<number, number[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justDroppedId, setJustDroppedId] = useState<number | null>(null);
  const [pulsingTiers, setPulsingTiers] = useState<Set<number>>(new Set());

  const handleDragEnd = useCallback(
    (event: any) => {
      const { over, active } = event;
      if (!over || !list) return;

      const draggedId = active.id as number;
      const targetId = over.id as number;

      const isFirstItemInTier =
        targetId !== -1 && (tierItems[targetId] ?? []).length === 0;

      setTierItems((prev) => {
        const next: Record<number, number[]> = {};
        for (const tier of list.tiers) {
          next[tier.id] = (prev[tier.id] ?? []).filter(
            (id) => id !== draggedId
          );
        }
        if (targetId !== -1 && next[targetId] !== undefined) {
          next[targetId] = [...next[targetId], draggedId];
        }
        return next;
      });

      if (targetId !== -1) {
        setJustDroppedId(draggedId);
        setTimeout(() => setJustDroppedId(null), 320);
      }

      if (isFirstItemInTier) {
        setPulsingTiers((prev) => new Set([...prev, targetId]));
        setTimeout(() => {
          setPulsingTiers((prev) => {
            const next = new Set(prev);
            next.delete(targetId);
            return next;
          });
        }, 450);
      }
    },
    [list, tierItems]
  );

  const handleSubmit = async () => {
    if (!list) return;

    const body: { itemId: number; value: number }[] = [];
    for (const tier of list.tiers) {
      for (const itemId of tierItems[tier.id] ?? []) {
        body.push({ itemId, value: tier.value });
      }
    }

    if (!body.length) {
      toast.error(S.rankings.submitEmpty);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/r/${token}/rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        toast.error(S.rankings.submitRateLimit);
        return;
      }
      if (res.status === 403) {
        toast.error(S.rankings.submitAnonDisabled);
        return;
      }
      if (!res.ok) {
        toast.error(S.rankings.submitFailed);
        return;
      }

      toast.success(S.rankings.submitted);
      router.push(`/r/${token}`);
    } catch {
      toast.error(S.rankings.submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
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
                href={`/r/${token}`}
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
          <div className="flex sm:hidden items-center gap-2 pb-3">
            <Link
              href={`/r/${token}`}
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
          <div className="flex flex-col gap-2">
            <Skeleton height={20} width="50%" />
            <Skeleton height={11} width="36%" />
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

  // ── Not found ────────────────────────────────────────────────────────────
  if (isError || !list) {
    return (
      <div className="fixed inset-0 z-10 bg-rk-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <p className="text-rk-primary text-[17px] font-[500]">
            {S.errors.linkNotFound}
          </p>
          <p className="text-[13px] text-rk-muted">
            {S.errors.linkNotFoundDetail}
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

  // ── Anon rankings disabled ────────────────────────────────────────────────
  if (!list.anonymous_rankings_enabled) {
    return (
      <div className="fixed inset-0 z-10 bg-rk-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <p className="text-rk-primary text-[17px] font-[500]">
            {S.errors.anonDisabledTitle}
          </p>
          <p className="text-[13px] text-rk-muted">
            {S.errors.anonDisabledDetail}
          </p>
          <Link
            href={`/r/${token}`}
            className="mt-2 px-4 py-2 text-[13px] font-[500] border border-rk-stroke text-rk-secondary rounded-[8px] hover:text-rk-primary transition-colors"
          >
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  // ── Ranking UI ────────────────────────────────────────────────────────────
  const placedIds = new Set(list.tiers.flatMap((t) => tierItems[t.id] ?? []));
  const unranked = list.items.filter((item) => !placedIds.has(item.id));

  return (
    <div className="fixed inset-0 z-10 bg-rk-page overflow-y-auto">
      <DndContext onDragEnd={handleDragEnd}>
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </div>
            <div className="hidden sm:flex justify-between items-center gap-2">
              <Link
                href={`/r/${token}`}
                className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
              >
                Back
              </Link>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
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
          <div className="flex sm:hidden items-center justify-between gap-2 pb-3">
            <Link
              href={`/r/${token}`}
              className="px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
            >
              Back
            </Link>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
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
        <div className="px-4 sm:px-8 py-6 flex flex-col gap-6 max-w-3xl mx-auto">
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

          {/* Tier rows */}
          <div className="flex flex-col gap-[6px]">
            {list.tiers.map((tier) => {
              if (tier.value === 0) return null;

              const style = TIER_STYLE[tier.title] ?? {
                bg: tier.color,
                text: "#000000",
              };
              const items = (tierItems[tier.id] ?? [])
                .map((id) => list.items.find((i) => i.id === id))
                .filter((i): i is SharedListItem => !!i);

              return (
                <div
                  key={tier.id}
                  className="flex border border-rk-stroke"
                  style={{ borderRadius: 10 }}
                >
                  <div
                    className="w-16 flex-shrink-0 flex flex-col items-center justify-center py-3 gap-[3px]"
                    style={{
                      backgroundColor: style.bg,
                      minHeight: 76,
                      borderTopLeftRadius: 9,
                      borderBottomLeftRadius: 9,
                    }}
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
                      {items.length}
                    </span>
                  </div>
                  <Droppable
                    id={tier.id}
                    className="flex flex-wrap gap-2 p-3 flex-1 min-h-[96px] content-start"
                    style={{
                      backgroundColor: "#0F1828",
                      borderTopRightRadius: 9,
                      borderBottomRightRadius: 9,
                    }}
                  >
                    {items.map((item) => (
                      <Draggable
                        key={item.id}
                        id={item.id}
                        url={item?.img || ""}
                      >
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

          {/* Unranked pool */}
          <div>
            <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest mb-2">
              Unranked
            </p>
            <Droppable
              id={-1}
              className="flex flex-wrap gap-2 min-h-[96px] content-start"
            >
              {unranked.map((item) => (
                <Draggable key={item.id} id={item.id} url={item?.img || ""}>
                  <ItemCard
                    item={item}
                    isJustDropped={justDroppedId === item.id}
                  />
                </Draggable>
              ))}
            </Droppable>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
