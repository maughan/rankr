"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  KeyRound,
  Brain,
  CheckCircle2,
  XCircle,
  User2Icon,
  Logs,
  Megaphone,
  Undo2,
} from "lucide-react";
import { getUserFromToken } from "@/lib/helpers";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionStatus = "idle" | "confirming" | "running" | "done" | "error";

interface ActionResult {
  label: string;
  detail: string;
}

// ── Tool card ─────────────────────────────────────────────────────────────────

function ToolCard({
  icon,
  title,
  description,
  danger,
  confirmLabel,
  confirmPrompt,
  onRun,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  danger?: boolean;
  confirmLabel: string;
  confirmPrompt?: string;
  onRun?: () => Promise<ActionResult>;
  link?: string;
}) {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState("");

  const handleTrigger = () => {
    if (confirmPrompt) {
      setStatus("confirming");
    } else {
      run();
    }
  };

  const run = async () => {
    setStatus("running");
    setResult(null);
    setError("");
    try {
      if (!onRun) return;
      const r = await onRun();
      setResult(r);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <div
      className={`rounded-[12px] border bg-rk-surface p-5 flex flex-col gap-4 ${
        danger ? "border-red-900/50" : "border-rk-stroke"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: danger
              ? "rgba(239,68,68,0.1)"
              : "rgba(74,138,232,0.1)",
            color: danger ? "#F87171" : "#4A8AE8",
          }}
        >
          {icon}
        </div>
        <div>
          <p className="text-[14px] font-[600] text-rk-primary leading-snug">
            {title}
          </p>
          <p className="text-[12px] text-rk-muted mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </div>

      {/* Confirm prompt */}
      {status === "confirming" && confirmPrompt && (
        <div className="rounded-[8px] border border-amber-800/40 bg-amber-900/10 px-3 py-3 flex flex-col gap-3">
          <p className="text-[12px] text-amber-300 leading-snug">
            {confirmPrompt}
          </p>
          <div className="flex gap-2">
            <button
              onClick={run}
              className="px-3 py-1.5 text-[12px] font-[500] bg-red-600 text-white rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Yes, do it
            </button>
            <button
              onClick={() => setStatus("idle")}
              className="px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[6px] hover:text-rk-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <div className="flex items-start gap-2 rounded-[8px] border border-green-900/40 bg-green-900/10 px-3 py-2.5">
          <CheckCircle2
            size={14}
            className="text-green-400 flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-[12px] font-[500] text-green-300">
              {result.label}
            </p>
            <p className="text-[11px] text-green-400/70 mt-0.5">
              {result.detail}
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-2 rounded-[8px] border border-red-900/40 bg-red-900/10 px-3 py-2.5">
          <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-300">{error}</p>
        </div>
      )}

      {/* Trigger */}
      {!link && (
        <>
          {status !== "confirming" && (
            <button
              onClick={handleTrigger}
              disabled={status === "running"}
              className={`self-start px-3 py-1.5 text-[12px] font-[500] rounded-[6px] transition-opacity disabled:opacity-40 cursor-pointer ${
                danger
                  ? "bg-red-700 text-white hover:opacity-90"
                  : "bg-rk-accent text-white hover:opacity-90"
              }`}
            >
              {status === "running" ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin inline-block" />
                  Running…
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          )}
        </>
      )}

      {/* Link */}
      {link && (
        <Link
          href={link}
          className={`self-start px-3 py-1.5 text-[12px] font-[500] rounded-[6px] transition-opacity disabled:opacity-40 cursor-pointer ${
            danger
              ? "bg-red-700 text-white hover:opacity-90"
              : "bg-rk-accent text-white hover:opacity-90"
          }`}
        >
          {confirmLabel}
        </Link>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminToolsPage() {
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

  const handleExpireTokens = async (): Promise<ActionResult> => {
    const res = await fetch("/api/admin/tools/expire-tokens", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Request failed.");
    const data = await res.json();
    // Redirect after a short delay — the caller's own token is now invalid
    setTimeout(() => {
      document.cookie = "auth_token=; path=/; max-age=0";
      window.location.href = "/login";
    }, 2500);
    return {
      label: `${data.affected} session${
        data.affected !== 1 ? "s" : ""
      } expired.`,
      detail:
        "Everyone has been signed out, including you. Redirecting to login…",
    };
  };

  const handleRecomputeArchetypes = async (): Promise<ActionResult> => {
    const res = await fetch("/api/admin/tools/recompute-archetypes", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Request failed.");
    const data = await res.json();
    const errNote =
      data.errors.length > 0 ? ` (${data.errors.length} failed)` : "";
    return {
      label: `${data.processed} user${
        data.processed !== 1 ? "s" : ""
      } processed.`,
      detail: `${data.computed} archetypes set · ${data.cleared} cleared${errNote}`,
    };
  };

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
          className="flex items-center gap-1.5 px-3 py-1.5 w-fit text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
        >
          <Undo2 size={13} />
          Back
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-rk-accent" />
            <h1 className="text-[18px] font-[600] text-rk-primary">
              Admin tools
            </h1>
          </div>
        </div>

        <p className="text-[13px] text-rk-muted -mt-2">
          Super-admin only. These actions affect all users immediately.
        </p>

        {/* Tools */}
        <div className="flex flex-col gap-4">
          <ToolCard
            icon={<KeyRound size={16} />}
            title="Expire all sessions"
            description="Increments every user's token version, invalidating all active JWTs. Use after a suspected credential leak or major security event."
            danger
            confirmLabel="Expire all sessions"
            confirmPrompt="This will sign out every user on the platform, including you. You'll be redirected to login once it completes. Are you sure?"
            onRun={handleExpireTokens}
          />

          <ToolCard
            icon={<Brain size={16} />}
            title="Recompute archetypes"
            description="Runs the archetype algorithm across the first 200 eligible users. Mirrors the daily cron job. Safe to run at any time."
            confirmLabel="Run now"
            onRun={handleRecomputeArchetypes}
          />

          <ToolCard
            icon={<User2Icon size={16} />}
            title="Impersonate user"
            description="Allows the admin to view the site in read-only access as another user."
            confirmLabel="Search users"
            link="/admin/users"
          />

          <ToolCard
            icon={<Logs size={16} />}
            title="Impersonation logs"
            description="Allows the admin to view logs for user impersonation."
            confirmLabel="See logs"
            link="/admin/impersonation-log"
          />

          <ToolCard
            icon={<Megaphone size={16} />}
            title="Announcements"
            description="Manage or create site wide announcements. Choose who can see the banner and add a CTA."
            confirmLabel="Go to announcements"
            link="/admin/announcements"
          />
        </div>
      </div>
    </div>
  );
}
