"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import UserAvatar from "@/app/components/UserAvatar";
import InlineFollowButton from "@/app/components/InlineFollowButton";
import { getUserFromToken } from "@/lib/helpers";

interface FollowUser {
  username: string;
  display_name: string | null;
  viewerFollowsThem: boolean;
  theyFollowViewer: boolean;
}

interface FollowPage {
  users: FollowUser[];
  nextCursor: string | null;
}

type Tab = "followers" | "following";

interface Props {
  username: string;
  initialTab: Tab;
  onClose: () => void;
}

export default function FollowListModal({ username, initialTab, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const viewer = getUserFromToken();
  const isOwner = viewer.username?.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    let cancelled = false;
    setUsers([]);
    setNextCursor(null);
    setError(false);
    setLoading(true);

    fetch(`/api/u/${username}/${tab}?limit=20`)
      .then((r) => r.json())
      .then((data: FollowPage) => {
        if (cancelled) return;
        setUsers(data.users);
        setNextCursor(data.nextCursor);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tab, username]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleLoadMore = () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    const cursor = encodeURIComponent(nextCursor);
    fetch(`/api/u/${username}/${tab}?limit=20&cursor=${cursor}`)
      .then((r) => r.json())
      .then((data: FollowPage) => {
        setUsers((prev) => [...prev, ...data.users]);
        setNextCursor(data.nextCursor);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-0 m-auto mx-3 sm:mx-auto z-[999] flex flex-col rounded-[10px] overflow-hidden"
        style={{
          backgroundColor: "#142036",
          border: "1px solid #1E2C44",
          width: "min(480px, calc(100vw - 24px))",
          maxHeight: "min(560px, 90vh)",
          height: "fit-content",
        }}
      >
        {/* Header */}
        <div className="flex items-center border-b border-rk-stroke flex-shrink-0 relative">
          {(["followers", "following"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[13px] font-[500] transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-rk-accent text-rk-primary"
                  : "border-transparent text-rk-muted hover:text-rk-secondary"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-rk-muted hover:text-rk-primary transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {loading && users.length === 0 && (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse py-1">
                  <div className="w-9 h-9 rounded-full bg-rk-stroke flex-shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3.5 w-28 bg-rk-stroke rounded-[4px]" />
                    <div className="h-3 w-20 bg-rk-stroke rounded-[4px]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && users.length === 0 && (
            <p className="text-center text-[13px] text-rk-muted py-10">
              No {tab} yet.
            </p>
          )}

          {error && (
            <p className="text-center text-[13px] text-rk-muted py-10">
              Failed to load. Try again.
            </p>
          )}

          {users.map((u) => (
            <div
              key={u.username}
              className="flex items-center gap-3 px-4 py-3 hover:bg-rk-row/50 transition-colors"
            >
              <Link href={`/u/${u.username}`} onClick={onClose} className="flex-shrink-0">
                <UserAvatar username={u.username} size={36} />
              </Link>
              <div className="flex flex-col min-w-0 flex-1">
                <Link
                  href={`/u/${u.username}`}
                  onClick={onClose}
                  className="text-[13px] font-[500] text-rk-primary hover:underline leading-snug truncate"
                >
                  {u.display_name ?? u.username}
                </Link>
                {u.display_name && (
                  <span className="text-[12px] text-rk-muted truncate">@{u.username}</span>
                )}
                {u.theyFollowViewer && !isOwner && (
                  <span className="text-[11px] text-rk-tertiary">Follows you</span>
                )}
              </div>
              {viewer.username?.toLowerCase() !== u.username.toLowerCase() && (
                <InlineFollowButton
                  username={u.username}
                  initialFollowing={u.viewerFollowsThem}
                />
              )}
            </div>
          ))}

          {nextCursor && (
            <div className="flex justify-center py-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="text-[13px] text-rk-accent hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
