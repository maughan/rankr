"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Eye,
  Loader2,
  ShieldBan,
  Clock,
  AlertTriangle,
  Undo2,
  Download,
} from "lucide-react";
import { getUserFromToken } from "@/lib/helpers";
import { formatDistanceStrict } from "date-fns";

interface UserDetail {
  id: number;
  username: string;
  email: string | null;
  display_name: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
  banned_at: string | null;
  ban_reason: string | null;
  suspended_until: string | null;
  onboarding_state: string;
  archetype: string | null;
  impersonation_opt_out: boolean;
  _count: { lists: number; rankings: number };
}

// ── Impersonate dialog ─────────────────────────────────────────────────────────

function ImpersonateDialog({
  username,
  onCancel,
  onDone,
}: {
  username: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/impersonation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: username, reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start impersonation.");
      }
      onDone();
      router.push("/feed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <div className="w-full max-w-md rounded-[16px] border border-amber-800/50 bg-rk-surface p-6 flex flex-col gap-5 shadow-2xl">
        {/* Icon + title */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(217,119,6,0.15)" }}
          >
            <Eye size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[15px] font-[600] text-rk-primary">
              Impersonate @{username}?
            </p>
            <p className="text-[12px] text-rk-muted mt-0.5">
              View-only · Audited · 30-min expiry
            </p>
          </div>
        </div>

        {/* Warning block */}
        <div className="rounded-[10px] border border-amber-800/40 bg-amber-900/10 px-4 py-3 flex flex-col gap-1.5">
          <p className="text-[12px] text-amber-300 font-[500]">
            Before you start
          </p>
          <ul className="text-[12px] text-amber-400/80 flex flex-col gap-1 list-disc list-inside">
            <li>All writes are blocked — you can only look.</li>
            <li>This session is logged and visible to all super admins.</li>
            <li>The session expires automatically after 30 minutes.</li>
            <li>The target user is not notified.</li>
          </ul>
        </div>

        {/* Reason field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] text-rk-muted">
            Reason{" "}
            <span className="text-rk-tertiary">(optional but encouraged)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. User reported they can't see their private lists — reproducing the issue."
            className="w-full rounded-[8px] border border-rk-stroke bg-rk-row px-3 py-2 text-[13px] text-rk-primary placeholder:text-rk-muted focus:outline-none focus:border-rk-accent resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[12px] text-red-400">
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-[500] bg-amber-600 text-white rounded-[8px] hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? "Starting…" : "Start impersonation"}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:text-rk-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { role, id: adminId } = getUserFromToken();
  const isSuperAdmin = role === "super_admin";

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${username}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [username]);

  if (role !== "admin" && role !== "super_admin") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0A1220" }}
      >
        <p className="text-[14px] text-rk-muted">Page not found.</p>
      </div>
    );
  }

  const canImpersonate =
    isSuperAdmin &&
    user !== null &&
    user.role !== "admin" &&
    user.role !== "super_admin" &&
    !user.impersonation_opt_out &&
    user.id !== adminId;

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

      {showDialog && user && (
        <ImpersonateDialog
          username={user.username}
          onCancel={() => setShowDialog(false)}
          onDone={() => setShowDialog(false)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 px-3 w-fit py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
        >
          <Undo2 size={13} />
          Back
        </Link>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-rk-accent" />
            <h1 className="text-[18px] font-[600] text-rk-primary">
              User detail
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-rk-muted" />
          </div>
        ) : !user ? (
          <p className="text-[13px] text-rk-muted text-center py-12">
            User not found.
          </p>
        ) : (
          <>
            {/* Profile card */}
            <div className="rounded-[12px] border border-rk-stroke bg-rk-surface p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-rk-row flex items-center justify-center text-[16px] font-[600] text-rk-muted flex-shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[15px] font-[600] text-rk-primary">
                      @{user.username}
                    </p>
                    {user.display_name && (
                      <p className="text-[12px] text-rk-muted">
                        {user.display_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {user.banned_at && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-[500] bg-red-900/20 text-red-400">
                      <ShieldBan size={11} /> Banned
                    </span>
                  )}
                  {user.suspended_until && !user.banned_at && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-[500] bg-amber-900/20 text-amber-400">
                      <Clock size={11} /> Suspended
                    </span>
                  )}
                  {(user.role === "admin" || user.role === "super_admin") && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-[500] bg-rk-accent/10 text-rk-accent capitalize">
                      {user.role.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-rk-tertiary uppercase tracking-wide text-[10px] font-[600]">
                    Email
                  </span>
                  <span className="text-rk-secondary">{user.email ?? "—"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-rk-tertiary uppercase tracking-wide text-[10px] font-[600]">
                    Joined
                  </span>
                  <span className="text-rk-secondary">
                    {formatDistanceStrict(
                      new Date(user.createdAt),
                      new Date(),
                      { addSuffix: true }
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-rk-tertiary uppercase tracking-wide text-[10px] font-[600]">
                    Lists
                  </span>
                  <span className="text-rk-secondary">{user._count.lists}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-rk-tertiary uppercase tracking-wide text-[10px] font-[600]">
                    Rankings
                  </span>
                  <span className="text-rk-secondary">
                    {user._count.rankings}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-rk-tertiary uppercase tracking-wide text-[10px] font-[600]">
                    Onboarding
                  </span>
                  <span className="text-rk-secondary capitalize">
                    {user.onboarding_state.replace("_", " ")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-rk-tertiary uppercase tracking-wide text-[10px] font-[600]">
                    Archetype
                  </span>
                  <span className="text-rk-secondary capitalize">
                    {user.archetype ?? "—"}
                  </span>
                </div>
              </div>

              {user.bio && (
                <p className="text-[12px] text-rk-muted italic border-t border-rk-stroke pt-3">
                  {user.bio}
                </p>
              )}

              {user.ban_reason && (
                <div className="rounded-[8px] border border-red-900/40 bg-red-900/10 px-3 py-2.5">
                  <p className="text-[11px] text-rk-tertiary uppercase tracking-wide font-[600] mb-1">
                    Ban reason
                  </p>
                  <p className="text-[12px] text-red-300">{user.ban_reason}</p>
                </div>
              )}
            </div>

            {/* Impersonation section */}
            <div className="rounded-[12px] border border-rk-stroke bg-rk-surface p-5 flex flex-col gap-3">
              <div>
                <p className="text-[14px] font-[600] text-rk-primary">
                  Impersonate (view only)
                </p>
                <p className="text-[12px] text-rk-muted mt-0.5">
                  Step into this user&apos;s session to see exactly what they
                  see. All writes are blocked. Session is audited.
                </p>
              </div>

              {!isSuperAdmin ? (
                <p className="text-[12px] text-rk-muted">
                  Requires super_admin role.
                </p>
              ) : user.role === "admin" || user.role === "super_admin" ? (
                <p className="text-[12px] text-rk-muted">
                  Cannot impersonate admin accounts.
                </p>
              ) : user.impersonation_opt_out ? (
                <p className="text-[12px] text-rk-muted">
                  This user has opted out of impersonation.
                </p>
              ) : user.id === adminId ? (
                <p className="text-[12px] text-rk-muted">
                  Cannot impersonate yourself.
                </p>
              ) : (
                <button
                  onClick={() => setShowDialog(true)}
                  className="self-start flex items-center gap-2 px-4 py-2 text-[12px] font-[500] rounded-[8px] border border-amber-700/50 text-amber-400 hover:bg-amber-900/15 transition-colors cursor-pointer"
                >
                  <Eye size={13} />
                  Impersonate (view only)
                </button>
              )}

              {canImpersonate && (
                <p className="text-[11px] text-rk-tertiary">
                  You will be redirected to the feed viewing as @{user.username}
                  . A vivid banner will be visible at all times. The session
                  auto-expires in 30 minutes.
                </p>
              )}
            </div>

            {/* Impersonation history */}
            <Link
              href={`/admin/impersonation-log?target_id=${user.id}`}
              className="text-[12px] text-rk-muted hover:text-rk-secondary transition-colors underline underline-offset-2"
            >
              View impersonation history for this user →
            </Link>

            {/* Data export */}
            {role === "super_admin" && (
              <a
                href={`/api/admin/users/${user.username.toLowerCase()}/export`}
                download
                className="self-start flex items-center gap-2 px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
              >
                <Download size={12} />
                Export user data (JSON)
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
