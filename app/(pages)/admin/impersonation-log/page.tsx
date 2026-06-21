"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, Loader2, ChevronDown, Undo2 } from "lucide-react";
import { getUserFromToken } from "@/lib/helpers";
import { format } from "date-fns";

interface ImpersonationSession {
  id: number;
  started_at: string;
  ended_at: string | null;
  expires_at: string;
  reason: string | null;
  ended_by: string | null;
  write_attempts: unknown[] | null;
  admin_user: { id: number; username: string };
  target_user: { id: number; username: string };
}

function durationLabel(session: ImpersonationSession): string {
  if (!session.ended_at) {
    const now = new Date();
    const expires = new Date(session.expires_at);
    if (expires > now) return "Active";
    return "Expired";
  }
  const ms =
    new Date(session.ended_at).getTime() -
    new Date(session.started_at).getTime();
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function SessionRow({ session }: { session: ImpersonationSession }) {
  const isActive =
    !session.ended_at && new Date(session.expires_at) > new Date();
  const wasExpired =
    !session.ended_at && new Date(session.expires_at) <= new Date();

  return (
    <div
      className={`rounded-[10px] border p-4 flex flex-col gap-2.5 ${
        isActive ? "border-amber-700/50 bg-amber-900/5" : "border-rk-stroke"
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[13px]">
          <Link
            href={`/admin/users/${session.admin_user.username}`}
            className="font-[500] text-rk-accent hover:underline"
          >
            @{session.admin_user.username}
          </Link>
          <span className="text-rk-tertiary">→</span>
          <Link
            href={`/admin/users/${session.target_user.username}`}
            className="font-[500] text-rk-primary hover:underline"
          >
            @{session.target_user.username}
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isActive && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-[500] bg-amber-900/20 text-amber-400">
              Active
            </span>
          )}
          {wasExpired && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-[500] bg-rk-stroke text-rk-muted">
              Expired (no exit)
            </span>
          )}
          {session.ended_by === "manual" && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-[500] bg-green-900/20 text-green-400">
              Exited
            </span>
          )}
          {session.ended_by === "expiry" && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-[500] bg-rk-stroke text-rk-muted">
              Auto-expired
            </span>
          )}
          <span className="text-[11px] text-rk-muted">
            {durationLabel(session)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
        <div className="flex gap-1.5 text-rk-tertiary">
          Started:
          <span className="text-rk-secondary">
            {format(new Date(session.started_at), "dd MMM yyyy HH:mm")}
          </span>
        </div>
        {session.ended_at && (
          <div className="flex gap-1.5 text-rk-tertiary">
            Ended:
            <span className="text-rk-secondary">
              {format(new Date(session.ended_at), "dd MMM yyyy HH:mm")}
            </span>
          </div>
        )}
      </div>

      {session.reason && (
        <p className="text-[12px] text-rk-muted italic border-t border-rk-stroke/50 pt-2">
          &ldquo;{session.reason}&rdquo;
        </p>
      )}
    </div>
  );
}

function LogContent() {
  const searchParams = useSearchParams();
  const prefilterTargetId = searchParams.get("target_id")
    ? Number(searchParams.get("target_id"))
    : undefined;

  const { role } = getUserFromToken();
  const [sessions, setSessions] = useState<ImpersonationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: number) => {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", String(cursor));
      if (prefilterTargetId) params.set("target_id", String(prefilterTargetId));
      const res = await fetch(`/api/admin/impersonation-log?${params}`);
      return res.ok ? res.json() : null;
    },
    [prefilterTargetId],
  );

  useEffect(() => {
    fetchPage()
      .then((data) => {
        if (!data) return;
        setSessions(data.sessions);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      })
      .finally(() => setLoading(false));
  }, [fetchPage]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    const data = await fetchPage(nextCursor);
    if (data) {
      setSessions((prev) => [...prev, ...data.sessions]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  };

  if (role !== "super_admin") {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[14px] text-rk-muted">Page not found.</p>
      </div>
    );
  }

  return (
    <>
      {prefilterTargetId && (
        <div className="rounded-[10px] border border-rk-stroke bg-rk-surface px-4 py-2.5 text-[12px] text-rk-muted flex items-center justify-between">
          <span>Filtered to target user ID {prefilterTargetId}</span>
          <Link
            href="/admin/impersonation-log"
            className="text-rk-accent hover:underline"
          >
            Clear filter
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-rk-muted" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-[13px] text-rk-muted text-center py-12">
          No impersonation sessions recorded.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center justify-center gap-1.5 py-2.5 text-[12px] text-rk-muted hover:text-rk-secondary transition-colors disabled:opacity-40 cursor-pointer"
            >
              {loadingMore ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ChevronDown size={13} />
              )}
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default function ImpersonationLogPage() {
  const { role } = getUserFromToken();

  if (role !== "super_admin") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0A1220" }}
      >
        <p className="text-[14px] text-rk-muted">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      <div
        className="border-b border-rk-stroke px-4 sm:px-8"
        style={{ backgroundColor: "#0A1220" }}
      >
        <div className="flex items-center justify-between h-12 flex-wrap w-full">
          <Link href="/feed" className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
            <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
              tierstack.dev
            </span>
          </Link>

          <div className="flex items-center gap-20">
            <div className="flex items-center gap-2">
              <ShieldAlert size={15} className="text-rk-accent" />
              <span className="text-[15px] font-[600] text-rk-primary">
                Admin
              </span>
              <span className="text-rk-tertiary text-[13px] ml-1">
                / Moderation
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 w-fit px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
        >
          <Undo2 size={13} />
          Back
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-rk-accent" />
            <h1 className="text-[18px] font-[600] text-rk-primary">
              Impersonation log
            </h1>
          </div>
        </div>

        <p className="text-[13px] text-rk-muted -mt-2">
          Append-only. Every super_admin can see every other super_admin&apos;s
          history.
        </p>

        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Loader2 size={20} className="animate-spin text-rk-muted" />
            </div>
          }
        >
          <LogContent />
        </Suspense>
      </div>
    </div>
  );
}
