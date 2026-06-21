"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import { Loader2, ChevronDown, ShieldAlert, Wrench, Undo2, ListChecks } from "lucide-react";
import { getUserFromToken } from "@/lib/helpers";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportTarget {
  id: number;
  title?: string; // list
  name?: string; // item
  username?: string; // profile
  visibility?: string;
  taken_down_at?: string | null;
  banned_at?: string | null;
  suspended_until?: string | null;
  createdBy?: { id: number; username: string };
}

interface Report {
  id: number;
  reportable_type: "list" | "item" | "profile";
  reportable_id: number;
  reason: string;
  context: string | null;
  status: string;
  created_at: string;
  target: ReportTarget | null;
}

interface Stats {
  openReports: number;
  reviewingReports: number;
  recentActions: number;
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hateful: "Hateful content",
  sexual: "Sexual content",
  copyright: "Copyright",
  minors: "Minors at risk",
  violence: "Violence",
  other: "Other",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function targetLabel(r: Report): string {
  if (!r.target) return `#${r.reportable_id}`;
  if (r.reportable_type === "list")
    return r.target.title ?? `list #${r.reportable_id}`;
  if (r.reportable_type === "item")
    return r.target.name ?? `item #${r.reportable_id}`;
  if (r.reportable_type === "profile")
    return `@${r.target.username ?? r.reportable_id}`;
  return `#${r.reportable_id}`;
}

function targetOwner(r: Report): string | null {
  if (r.reportable_type === "list" && r.target?.createdBy) {
    return `@${r.target.createdBy.username}`;
  }
  return null;
}

function currentState(r: Report): string {
  if (!r.target) return "";
  if (r.reportable_type === "list") {
    if (r.target.taken_down_at) return "taken down";
    if (r.target.visibility === "draft") return "draft";
    return r.target.visibility ?? "";
  }
  if (r.reportable_type === "item") {
    return r.target.taken_down_at ? "taken down" : "live";
  }
  if (r.reportable_type === "profile") {
    if (r.target.banned_at) return "banned";
    if (
      r.target.suspended_until &&
      new Date(r.target.suspended_until) > new Date()
    ) {
      return "suspended";
    }
    return "active";
  }
  return "";
}

// ── Action panel ──────────────────────────────────────────────────────────────

function ActionPanel({
  report,
  onDone,
}: {
  report: Report;
  onDone: () => void;
}) {
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [suspendDays, setSuspendDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isProfile = report.reportable_type === "profile";
  const isListOrItem =
    report.reportable_type === "list" || report.reportable_type === "item";

  const availableActions = [
    { value: "dismiss_report", label: "Dismiss — no action needed" },
    ...(isListOrItem
      ? [{ value: "take_down", label: "Take down content" }]
      : []),
    ...(isListOrItem && report.target?.taken_down_at
      ? [{ value: "restore", label: "Restore content" }]
      : []),
    ...(isProfile
      ? [{ value: "warn_user", label: "Warn user (log only)" }]
      : []),
    ...(isProfile ? [{ value: "suspend_user", label: "Suspend user" }] : []),
    ...(isProfile ? [{ value: "ban_user", label: "Ban user" }] : []),
    ...(isProfile && report.target?.suspended_until
      ? [{ value: "unsuspend_user", label: "Lift suspension" }]
      : []),
    ...(isProfile && report.target?.banned_at
      ? [{ value: "unban_user", label: "Unban user" }]
      : []),
  ];

  const handleSubmit = async () => {
    if (!action) {
      setError("Select an action.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/reports/${report.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: action,
          reason: reason || undefined,
          suspend_days: action === "suspend_user" ? suspendDays : undefined,
        }),
      });
      if (!res.ok) {
        setError("Request failed.");
        return;
      }
      onDone();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 p-3 rounded-[8px] border border-rk-stroke flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] text-rk-tertiary uppercase tracking-wide">
          Action
        </label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="bg-rk-row border border-rk-stroke rounded-[6px] px-2 py-1.5 text-[13px] text-rk-primary outline-none cursor-pointer"
        >
          <option value="">Select…</option>
          {availableActions.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {action === "suspend_user" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-rk-tertiary uppercase tracking-wide">
            Suspend for (days)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={suspendDays}
            onChange={(e) => setSuspendDays(Number(e.target.value))}
            className="bg-rk-row border border-rk-stroke rounded-[6px] px-2 py-1.5 text-[13px] text-rk-primary outline-none w-24"
          />
        </div>
      )}

      {action &&
        action !== "dismiss_report" &&
        action !== "restore" &&
        action !== "unsuspend_user" &&
        action !== "unban_user" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-rk-tertiary uppercase tracking-wide">
              Reason / notes (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              className="bg-rk-row border border-rk-stroke rounded-[6px] px-2 py-1.5 text-[13px] text-rk-primary outline-none resize-none"
              placeholder="Internal notes…"
            />
          </div>
        )}

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !action}
        className="self-start px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
      >
        {submitting ? "Submitting…" : "Submit action"}
      </button>
    </div>
  );
}

// ── Report row ────────────────────────────────────────────────────────────────

function ReportRow({
  report,
  onActionDone,
}: {
  report: Report;
  onActionDone: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = targetLabel(report);
  const owner = targetOwner(report);
  const state = currentState(report);

  return (
    <div className="bg-rk-surface border border-rk-stroke rounded-[10px] overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        {/* Type badge */}
        <span className="mt-0.5 flex-shrink-0 text-[10px] font-[600] uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-rk-row text-rk-muted">
          {report.reportable_type}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-[500] text-rk-primary truncate">
              {label}
            </span>
            {owner && (
              <span className="text-[11px] text-rk-tertiary">{owner}</span>
            )}
            {state && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-[4px] ${
                  state === "taken down" || state === "banned"
                    ? "bg-red-900/30 text-red-400"
                    : state === "suspended"
                    ? "bg-amber-900/30 text-amber-400"
                    : "bg-rk-row text-rk-tertiary"
                }`}
              >
                {state}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-rk-tertiary">
              {REASON_LABELS[report.reason] ?? report.reason}
            </span>
            <span className="text-rk-tertiary text-[11px]">·</span>
            <span className="text-[11px] text-rk-tertiary">
              {formatDistanceStrict(new Date(report.created_at), new Date())}{" "}
              ago
            </span>
          </div>
          {report.context && (
            <p className="text-[11px] text-rk-muted mt-1 leading-snug italic">
              &ldquo;{report.context}&rdquo;
            </p>
          )}
        </div>

        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-rk-tertiary mt-0.5 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-rk-stroke">
          <ActionPanel
            report={report}
            onDone={() => {
              setExpanded(false);
              onActionDone();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type StatusFilter = "open" | "reviewing" | "actioned" | "dismissed";
type TypeFilter = "all" | "list" | "item" | "profile";

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchReports = useCallback(
    async (cursor?: number, append = false) => {
      if (!append) setLoading(true);
      const params = new URLSearchParams({ status: statusFilter });
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (cursor !== undefined) params.set("cursor", String(cursor));

      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setReports((prev) =>
        append ? [...prev, ...data.reports] : data.reports
      );
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setLoading(false);
      setLoadingMore(false);
    },
    [statusFilter, typeFilter]
  );

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d));
  }, []);

  useEffect(() => {
    setReports([]);
    setNextCursor(null);
    fetchReports();
  }, [fetchReports]);

  if (notFound) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0A1220" }}
      >
        <p className="text-[14px] text-rk-muted">Page not found.</p>
      </div>
    );
  }

  const { role } = getUserFromToken();
  const isSuperAdmin = role === "super_admin";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <div
        className="border-b border-rk-stroke px-4 sm:px-8"
        style={{ backgroundColor: "#0A1220" }}
      >
        <div className="flex items-center justify-between h-[90px] sm:h-12 flex-wrap w-full">
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

          <div className="flex justify-between sm:hidden items-center gap-3 w-full">
            <Link
              href="/feed"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
            >
              <Undo2 size={13} />
              Back
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/lists"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
              >
                <ListChecks size={12} />
                Lists
              </Link>

              {isSuperAdmin && (
                <Link
                  href="/admin/tools"
                  className="flex items-center bg-rk-accent gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-primary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
                >
                  <Wrench size={12} />
                  Tools
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="hidden justify-between sm:flex items-center gap-3 w-full">
          <Link
            href="/feed"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
          >
            <Undo2 size={13} />
            Back
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/lists"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
            >
              <ListChecks size={12} />
              Lists
            </Link>

            {isSuperAdmin && (
              <Link
                href="/admin/tools"
                className="flex items-center bg-rk-accent gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-primary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
              >
                <Wrench size={12} />
                Tools
              </Link>
            )}
          </div>
        </div>
        {/* Mobile stats */}
        {stats && (
          <div className="flex items-center gap-4 mx-auto">
            <Stat
              label="Open"
              value={stats.openReports}
              alert={stats.openReports > 0}
            />
            <Stat label="Reviewing" value={stats.reviewingReports} />
            <Stat label="Actions (7d)" value={stats.recentActions} />
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-[8px] border border-rk-stroke overflow-hidden">
            {(
              ["open", "reviewing", "actioned", "dismissed"] as StatusFilter[]
            ).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[12px] font-[500] capitalize transition-colors cursor-pointer ${
                  statusFilter === s
                    ? "bg-rk-accent text-white"
                    : "text-rk-muted hover:text-rk-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex rounded-[8px] border border-rk-stroke overflow-hidden">
            {(["all", "list", "item", "profile"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-[12px] font-[500] capitalize transition-colors cursor-pointer ${
                  typeFilter === t
                    ? "bg-rk-surface text-rk-primary"
                    : "text-rk-muted hover:text-rk-primary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Report list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="text-rk-muted animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-[13px] text-rk-muted py-8 text-center">
            No {statusFilter} reports
            {typeFilter !== "all" ? ` for ${typeFilter}` : ""}.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                onActionDone={() => fetchReports()}
              />
            ))}

            {hasMore && (
              <button
                onClick={() => {
                  setLoadingMore(true);
                  fetchReports(nextCursor ?? undefined, true);
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

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="flex items-end text-right gap-2">
      <p
        className={`text-[16px] font-[600] ${
          alert ? "text-amber-400" : "text-rk-primary"
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] text-rk-tertiary">{label}</p>
    </div>
  );
}
