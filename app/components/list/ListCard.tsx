"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { EyeClosed, Trash2 } from "lucide-react";
import { listUrl } from "@/lib/listUrl";
import { ImageKitLoader, processResponseData } from "@/lib/helpers";
import type { ListPreview } from "@/app/types";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteListMutation } from "@/lib/api/listsApi";
import Modal from "@/app/components/modal";
import GeneratedCover from "@/app/components/feed/GeneratedCover";

// Mirrors the feed RichListCard tier colors.
const TIER_COLORS: Record<string, string> = {
  S: "#C44545",
  A: "#E08C2C",
  B: "#97C459",
  C: "#5DCAA5",
  D: "#85B7EB",
  F: "#AFA9EC",
};
const COVER_FALLBACK = ["#C44545", "#E08C2C", "#97C459", "#5DCAA5", "#85B7EB"];

export default function ListCard({
  list,
  currentUserId,
}: {
  list: ListPreview;
  currentUserId: number;
}) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteList, { isLoading: deleting, error: deleteError }] =
    useDeleteListMutation();

  const isOwner = list.createdBy.id === currentUserId;
  const canDelete = isOwner;

  // Cover colors + tier-preview strip, mirroring the feed card (derived from
  // the top-tier items already in the ListPreview payload).
  const coverColors = (() => {
    const c = list.top_tier_items
      .map((i) => i.color)
      .filter((x): x is string => !!x)
      .slice(0, 5);
    return c.length ? c : COVER_FALLBACK;
  })();
  const tierStrip = (() => {
    const counts = new Map<string, number>();
    for (const it of list.top_tier_items) {
      counts.set(it.tier, (counts.get(it.tier) ?? 0) + 1);
    }
    return [...counts.entries()].map(([title, count]) => ({ title, count }));
  })();

  const handleDeleteConfirm = async () => {
    const result = await deleteList(list.id);
    if (!("error" in result)) setDeleteOpen(false);
  };

  const handleMouseEnter = () => {
    const key = ["list", list.id] as const;
    queryClient.prefetchQuery({
      queryKey: key,
      queryFn: async () => {
        const res = await fetch(`/api/s/${list.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return processResponseData([await res.json()])[0];
      },
      staleTime: 30_000,
    });
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter}>
      <Link href={listUrl(list)}>
        <div className="relative bg-rk-surface border border-rk-stroke rounded-[10px] overflow-hidden hover:border-rk-muted transition-colors min-h-[170px]">
          {list.is_template && (
            <span
              className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-[600] uppercase tracking-wide text-rk-accent"
              style={{ backgroundColor: "rgba(10,18,32,0.72)" }}
            >
              Template
            </span>
          )}
          {list.img ? (
            <div className="relative h-[84px]">
              <Image
                loader={ImageKitLoader}
                src={list.img}
                alt=""
                fill
                sizes="360px"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          ) : (
            <GeneratedCover colors={coverColors} title={list.title} />
          )}
          <div className="px-3 py-3 flex flex-col gap-2">
            <p className="text-[14px] font-[500] text-rk-primary truncate">
              {list.title}
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-rk-muted">
                {list.item_count} item{list.item_count !== 1 ? "s" : ""}
              </span>
              {list.ranker_count > 0 && (
                <>
                  <span className="text-rk-tertiary text-[11px]">·</span>
                  <span className="text-[11px] text-rk-muted">
                    {list.ranker_count} stacker
                    {list.ranker_count !== 1 ? "s" : ""}
                  </span>
                </>
              )}
              <span className="text-rk-tertiary text-[11px]">·</span>
              <span className="text-[11px] text-rk-tertiary">
                {formatDistanceStrict(new Date(list.updatedAt), new Date())} ago
              </span>
            </div>
            {tierStrip.length > 0 && (
              <div className="flex gap-0.5 h-[5px]">
                {tierStrip.map((t) => (
                  <span
                    key={t.title}
                    className="rounded-full"
                    style={{
                      flex: t.count,
                      backgroundColor: TIER_COLORS[t.title] ?? "#1E2C44",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {isOwner && list.visibility !== "public" && (
        <div className="absolute top-2 right-2" title="Not public">
          <div
            className="w-8 h-8 flex items-center justify-center rounded-[6px]"
            style={{ backgroundColor: "rgba(10,18,32,0.72)" }}
          >
            <EyeClosed size={14} className="text-rk-accent" />
          </div>
        </div>
      )}

      {canDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            setDeleteOpen(true);
          }}
          title="Delete list"
          className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-[6px] text-rk-muted hover:text-red-400 transition-colors cursor-pointer"
          style={{ backgroundColor: "rgba(10,18,32,0.72)" }}
        >
          <Trash2 size={14} />
        </button>
      )}

      <Modal
        open={deleteOpen}
        handleClose={() => !deleting && setDeleteOpen(false)}
      >
        <div className="p-6 pt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-[17px] font-[500] text-rk-primary">
              Delete &ldquo;{list.title}&rdquo;?
            </p>
            <p className="text-[13px] text-rk-muted leading-snug">
              The list will be moved to Recently Deleted. You have 30 days to
              restore it before it&rsquo;s permanently removed.
            </p>
          </div>

          {deleteError && (
            <p className="text-[12px] text-red-400">
              Something went wrong. Please try again.
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="flex-1 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors disabled:opacity-40 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="flex-1 py-2 text-[13px] font-[600] text-white bg-red-600 hover:bg-red-500 rounded-[8px] transition-colors disabled:opacity-40 cursor-pointer"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
