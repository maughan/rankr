"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { getUserFromToken } from "@/lib/helpers";

interface AdminList {
  id: number;
  title: string;
  visibility: string;
  is_template: boolean;
  is_featured: boolean;
  createdBy: { id: number; username: string } | null;
}

type FlagKey = "is_template" | "is_featured";

export default function AdminListsPage() {
  const { role } = getUserFromToken();
  const [lists, setLists] = useState<AdminList[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const isAdmin = role === "admin" || role === "super_admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A1220" }}>
        <p className="text-[14px] text-rk-muted">Page not found.</p>
      </div>
    );
  }

  const fetchLists = async (cursor?: number, append = false) => {
    if (!append) setLoading(true);
    const params = new URLSearchParams();
    if (cursor !== undefined) params.set("cursor", String(cursor));
    const res = await fetch(`/api/admin/lists?${params}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setLists((prev) => (append ? [...prev, ...data.lists] : data.lists));
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetchLists();
  }, []);

  const toggle = async (list: AdminList, flag: FlagKey) => {
    // Only public lists may be flagged as templates.
    if (flag === "is_template" && !list[flag] && list.visibility !== "public") return;
    const tk = `${list.id}:${flag}`;
    setToggling(tk);
    try {
      const res = await fetch(`/api/admin/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [flag]: !list[flag] }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLists((prev) =>
          prev.map((l) => (l.id === list.id ? { ...l, [flag]: updated[flag] } : l))
        );
      }
    } finally {
      setToggling(null);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A1220" }}>
        <p className="text-[14px] text-rk-muted">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-rk-stroke px-4 sm:px-8" style={{ backgroundColor: "#0A1220" }}>
        <div className="flex items-center justify-between h-12 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-rk-accent" />
            <span className="text-[15px] font-[600] text-rk-primary">Admin</span>
            <span className="text-rk-tertiary text-[13px] ml-1">/ Lists</span>
          </div>
          <Link
            href="/admin"
            className="text-[12px] text-rk-muted hover:text-rk-secondary transition-colors"
          >
            ← Moderation
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <p className="text-[13px] text-rk-muted">
          Flag public lists as <span className="text-rk-accent">templates</span> (shown in the gallery) or{" "}
          <span className="text-green-400">featured</span>. Only public lists can be templates.
        </p>

        {/* Lists */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={18} className="text-rk-muted animate-spin" />
          </div>
        ) : lists.length === 0 ? (
          <p className="text-[13px] text-rk-muted text-center py-8">No public lists yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {lists.map((list) => {
              const templateDisabled = !list.is_template && list.visibility !== "public";
              return (
                <div
                  key={list.id}
                  className="rounded-[10px] border border-rk-stroke bg-rk-surface px-4 py-3 flex items-center gap-3"
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-[500] text-rk-primary truncate">{list.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] font-[500] bg-rk-row text-rk-tertiary">
                        {list.visibility}
                      </span>
                    </div>
                    {list.createdBy && (
                      <p className="text-[11px] text-rk-tertiary mt-0.5">@{list.createdBy.username}</p>
                    )}
                  </div>

                  {/* Template toggle */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => toggle(list, "is_template")}
                      disabled={toggling === `${list.id}:is_template` || templateDisabled}
                      title={templateDisabled ? "Only public lists can be templates" : undefined}
                      className="cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                      aria-label={list.is_template ? "Unflag template" : "Flag as template"}
                    >
                      {toggling === `${list.id}:is_template` ? (
                        <Loader2 size={20} className="text-rk-muted animate-spin" />
                      ) : list.is_template ? (
                        <ToggleRight size={20} className="text-rk-accent" />
                      ) : (
                        <ToggleLeft size={20} className="text-rk-tertiary" />
                      )}
                    </button>
                    <span className="text-[9px] text-rk-tertiary uppercase tracking-wide">template</span>
                  </div>

                  {/* Featured toggle */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => toggle(list, "is_featured")}
                      disabled={toggling === `${list.id}:is_featured`}
                      className="cursor-pointer disabled:opacity-40 transition-opacity"
                      aria-label={list.is_featured ? "Unflag featured" : "Flag as featured"}
                    >
                      {toggling === `${list.id}:is_featured` ? (
                        <Loader2 size={20} className="text-rk-muted animate-spin" />
                      ) : list.is_featured ? (
                        <ToggleRight size={20} className="text-green-400" />
                      ) : (
                        <ToggleLeft size={20} className="text-rk-tertiary" />
                      )}
                    </button>
                    <span className="text-[9px] text-rk-tertiary uppercase tracking-wide">featured</span>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={() => {
                  setLoadingMore(true);
                  fetchLists(nextCursor ?? undefined, true);
                }}
                disabled={loadingMore}
                className="self-center mt-2 px-4 py-2 text-[13px] text-rk-muted border border-rk-stroke rounded-[8px] hover:text-rk-primary hover:border-rk-muted transition-colors disabled:opacity-40 cursor-pointer"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
