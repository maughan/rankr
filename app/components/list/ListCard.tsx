"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDistanceStrict } from "date-fns";
import { EyeClosed } from "lucide-react";
import { listUrl } from "@/lib/listUrl";
import { ImageKitLoader, processResponseData } from "@/lib/helpers";
import type { ListPreview, TopTierItem } from "@/app/types";
import { useQueryClient } from "@tanstack/react-query";

export default function ListCard({
  list,
  currentUserId,
}: {
  list: ListPreview;
  currentUserId: number;
}) {
  const queryClient = useQueryClient();

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

      {list.createdBy.id === currentUserId && list.visibility !== "public" && (
        <div className="absolute top-2 right-2" title="Not public">
          <div
            className="w-8 h-8 flex items-center justify-center rounded-[6px]"
            style={{ backgroundColor: "rgba(10,18,32,0.72)" }}
          >
            <EyeClosed size={14} className="text-rk-accent" />
          </div>
        </div>
      )}
    </div>
  );
}
