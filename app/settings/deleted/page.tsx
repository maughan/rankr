"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { formatDistanceStrict } from "date-fns";
import { toast } from "sonner";
import { ImageKitLoader } from "@/lib/helpers";

interface DeletedList {
  id: number;
  title: string;
  img: string | null;
  item_count: number;
  deleted_at: string;
  expires_at: string;
}

export default function RecentlyDeletedPage() {
  const [lists, setLists] = useState<DeletedList[] | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/user/deleted-lists")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setLists)
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

  const handleRestore = async (list: DeletedList) => {
    setRestoring(list.id);
    try {
      const res = await fetch(`/api/s/${list.id}/restore`, { method: "POST" });
      if (!res.ok) {
        toast.error("Couldn't restore the list. Please try again.");
        return;
      }
      setLists((prev) => prev?.filter((l) => l.id !== list.id) ?? null);
      toast.success(`"${list.title}" restored.`);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setRestoring(null);
    }
  };

  const now = new Date();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/settings/profile"
            className="text-rk-muted hover:text-rk-secondary transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-[18px] font-[600] text-rk-primary">
            Recently deleted
          </h1>
        </div>

        <p className="text-[13px] text-rk-muted leading-snug">
          Deleted lists are permanently removed after 30 days. Restore a list
          to make it available again.
        </p>

        {lists === null ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="text-rk-muted animate-spin" />
          </div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Trash2 size={28} className="text-rk-tertiary" />
            <p className="text-[14px] text-rk-muted">No recently deleted lists</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lists.map((list) => {
              const expiresAt = new Date(list.expires_at);
              const daysLeft = Math.ceil(
                (expiresAt.getTime() - now.getTime()) / 86_400_000
              );
              const isRestoring = restoring === list.id;

              return (
                <div
                  key={list.id}
                  className="bg-rk-surface border border-rk-stroke rounded-[10px] overflow-hidden flex items-center gap-3 p-3"
                >
                  {list.img ? (
                    <div className="relative w-14 h-14 flex-shrink-0 rounded-[6px] overflow-hidden">
                      <Image
                        loader={ImageKitLoader}
                        src={list.img}
                        alt=""
                        fill
                        sizes="56px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 flex-shrink-0 rounded-[6px]"
                      style={{ backgroundColor: "#0F1828" }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-[500] text-rk-primary truncate">
                      {list.title}
                    </p>
                    <p className="text-[11px] text-rk-tertiary mt-0.5">
                      {list.item_count} item{list.item_count !== 1 ? "s" : ""} ·{" "}
                      deleted{" "}
                      {formatDistanceStrict(new Date(list.deleted_at), now)} ago
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        daysLeft <= 3 ? "text-red-400" : "text-rk-tertiary"
                      }`}
                    >
                      {daysLeft <= 0
                        ? "Expires today"
                        : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left to restore`}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRestore(list)}
                    disabled={isRestoring}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors disabled:opacity-40 flex-shrink-0 cursor-pointer"
                  >
                    {isRestoring ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RotateCcw size={13} />
                    )}
                    Restore
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
