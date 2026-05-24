"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { EyeClosed, Trash2, AlertTriangle } from "lucide-react";
import { listUrl } from "@/lib/listUrl";
import { ImageKitLoader, processResponseData } from "@/lib/helpers";
import type { ListPreview, TopTierItem } from "@/app/types";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteListMutation } from "@/lib/api/listsApi";
import Modal from "@/app/components/modal";

export default function ListCard({
  list,
  currentUserId,
}: {
  list: ListPreview;
  currentUserId: number;
}) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteList, { isLoading: deleting, error: deleteError }] = useDeleteListMutation();

  const isOwner = list.createdBy.id === currentUserId;
  const isDraft = list.visibility === "draft";
  const canDelete = isOwner && isDraft;

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
        <div className="bg-rk-surface border border-rk-stroke rounded-[10px] overflow-hidden hover:border-rk-muted transition-colors">
          {list.img ? (
            <div className="relative h-36">
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
            <div
              className="h-36 p-3 flex flex-wrap gap-1.5 content-start overflow-hidden"
              style={{ backgroundColor: "#0F1828" }}
            >
              {list.top_tier_items.map((item: TopTierItem) => (
                <div
                  key={item.id}
                  className="w-[22px] h-[22px] rounded-[4px] flex-shrink-0"
                  style={{ backgroundColor: item.color ?? "#334155" }}
                />
              ))}
              {list.top_tier_items.length === 0 && (
                <p className="text-[11px] text-rk-tertiary">No items yet</p>
              )}
            </div>
          )}
          <div className="px-3 py-3">
            <p className="text-[15px] font-[500] text-rk-primary truncate">
              {list.title}
            </p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="text-[11px] text-rk-tertiary">
                {list.item_count} item{list.item_count !== 1 ? "s" : ""}
              </span>
              <span className="text-rk-tertiary text-[11px]">·</span>
              <span className="text-[11px] text-rk-tertiary">
                {formatDistanceStrict(new Date(list.updatedAt), new Date())} ago
              </span>
              {list.ranker_count > 0 && (
                <>
                  <span className="text-rk-tertiary text-[11px]">·</span>
                  <span className="text-[11px] text-rk-tertiary">
                    {list.ranker_count} stacker
                    {list.ranker_count !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
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

      {false && canDelete && (
        <button
          onClick={(e) => { e.preventDefault(); setDeleteOpen(true); }}
          title="Delete list"
          className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-[6px] text-rk-muted hover:text-red-400 transition-colors cursor-pointer"
          style={{ backgroundColor: "rgba(10,18,32,0.72)" }}
        >
          <Trash2 size={14} />
        </button>
      )}

      <Modal open={deleteOpen} handleClose={() => !deleting && setDeleteOpen(false)}>
        <div className="p-6 pt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-[17px] font-[500] text-rk-primary">
              Delete &ldquo;{list.title}&rdquo;?
            </p>
            {list.ranking_count > 0 ? (
              <div className="flex items-start gap-2 p-3 rounded-[8px] bg-amber-950/30 border border-amber-800/40">
                <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-amber-300 leading-snug">
                  {list.ranking_count} ranking{list.ranking_count !== 1 ? "s" : ""} will be permanently deleted.
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-rk-muted">This list has no rankings. It will be permanently deleted.</p>
            )}
          </div>

          {deleteError && (
            <p className="text-[12px] text-red-400">Something went wrong. Please try again.</p>
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
