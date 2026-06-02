"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import { Megaphone, ShieldAlert, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { getUserFromToken } from "@/lib/helpers";

// ── Types ─────────────────────────────────────────────────────────────────────

type Severity = "info" | "warning" | "critical";
type Audience = "all" | "authed" | "anon";

interface Announcement {
  id: number;
  message: string;
  severity: Severity;
  audience: Audience;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  cta_label: string | null;
  cta_url: string | null;
  created_at: string;
}

// ── Severity badge ─────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string }> = {
  info:     { bg: "rgba(74,138,232,0.12)",  text: "#93B8F7" },
  warning:  { bg: "rgba(217,119,6,0.15)",   text: "#FCD34D" },
  critical: { bg: "rgba(220,38,38,0.15)",   text: "#FCA5A5" },
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const c = SEVERITY_COLORS[severity];
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-[500] capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {severity}
    </span>
  );
}

// ── Create form ────────────────────────────────────────────────────────────────

interface CreateFormProps {
  onCreated: () => void;
}

function CreateForm({ onCreated }: CreateFormProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("info");
  const [audience, setAudience] = useState<Audience>("all");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          severity,
          audience,
          cta_label: ctaLabel || null,
          cta_url: ctaUrl || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create.");
      }
      setMessage("");
      setCtaLabel("");
      setCtaUrl("");
      setOpen(false);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
      >
        <Plus size={13} />
        New announcement
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[12px] border border-rk-stroke bg-rk-surface p-5 flex flex-col gap-4"
    >
      <p className="text-[14px] font-[600] text-rk-primary">New announcement</p>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] text-rk-muted">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          required
          placeholder="System maintenance scheduled for tonight at 10 PM UTC."
          className="w-full rounded-[8px] border border-rk-stroke bg-rk-row px-3 py-2 text-[13px] text-rk-primary placeholder:text-rk-muted focus:outline-none focus:border-rk-accent resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] text-rk-muted">Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            className="rounded-[8px] border border-rk-stroke bg-rk-row px-3 py-2 text-[13px] text-rk-primary focus:outline-none focus:border-rk-accent"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] text-rk-muted">Audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="rounded-[8px] border border-rk-stroke bg-rk-row px-3 py-2 text-[13px] text-rk-primary focus:outline-none focus:border-rk-accent"
          >
            <option value="all">Everyone</option>
            <option value="authed">Logged-in users</option>
            <option value="anon">Anonymous visitors</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] text-rk-muted">CTA label (optional)</label>
          <input
            type="text"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="Learn more"
            className="rounded-[8px] border border-rk-stroke bg-rk-row px-3 py-2 text-[13px] text-rk-primary placeholder:text-rk-muted focus:outline-none focus:border-rk-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] text-rk-muted">CTA URL (optional)</label>
          <input
            type="url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="https://..."
            className="rounded-[8px] border border-rk-stroke bg-rk-row px-3 py-2 text-[13px] text-rk-primary placeholder:text-rk-muted focus:outline-none focus:border-rk-accent"
          />
        </div>
      </div>

      {error && (
        <p className="text-[12px] text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !message.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] bg-rk-accent text-white rounded-[6px] hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          {saving ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[6px] hover:text-rk-primary transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Announcement row ───────────────────────────────────────────────────────────

function AnnouncementRow({
  ann,
  onToggle,
  onDelete,
}: {
  ann: Announcement;
  onToggle: (id: number, active: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(ann.id, !ann.is_active);
    setToggling(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this announcement?")) return;
    setDeleting(true);
    await onDelete(ann.id);
  };

  return (
    <div className={`rounded-[10px] border p-4 flex flex-col gap-3 ${ann.is_active ? "border-rk-stroke" : "border-rk-stroke/50 opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={ann.severity} />
          <span className="text-[11px] text-rk-muted capitalize">{ann.audience === "all" ? "everyone" : ann.audience === "authed" ? "logged-in" : "anonymous"}</span>
          <span className="text-[11px] text-rk-tertiary">
            {formatDistanceStrict(new Date(ann.created_at), new Date(), { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={ann.is_active ? "Deactivate" : "Activate"}
            className="p-1.5 rounded-[6px] hover:bg-white/5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {ann.is_active
              ? <ToggleRight size={16} className="text-green-400" />
              : <ToggleLeft size={16} className="text-rk-muted" />
            }
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete"
            className="p-1.5 rounded-[6px] hover:bg-red-900/20 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {deleting
              ? <Loader2 size={14} className="animate-spin text-rk-muted" />
              : <Trash2 size={14} className="text-rk-muted hover:text-red-400" />
            }
          </button>
        </div>
      </div>

      <p className="text-[13px] text-rk-primary leading-snug">{ann.message}</p>

      {ann.cta_label && (
        <p className="text-[12px] text-rk-muted">
          CTA: <span className="text-rk-accent">{ann.cta_label}</span>
          {ann.cta_url && <> → <span className="text-rk-secondary">{ann.cta_url}</span></>}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAnnouncementsPage() {
  const { role } = getUserFromToken();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) return;
      const data = await res.json();
      setAnnouncements(data.announcements);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: number, active: boolean) => {
    await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: active }),
    });
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: active } : a))
    );
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  if (role !== "admin" && role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A1220" }}>
        <p className="text-[14px] text-rk-muted">Page not found.</p>
      </div>
    );
  }

  const active = announcements.filter((a) => a.is_active);
  const inactive = announcements.filter((a) => !a.is_active);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Megaphone size={18} className="text-rk-accent" />
            <h1 className="text-[18px] font-[600] text-rk-primary">Announcements</h1>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
          >
            ← Moderation
          </Link>
        </div>

        <p className="text-[13px] text-rk-muted -mt-2">
          Active announcements appear as a full-width strip at the top of every page. Users can dismiss them per-session.
        </p>

        <CreateForm onCreated={load} />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-rk-muted" />
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-[13px] text-rk-muted text-center py-8">No announcements yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {active.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-[600] text-rk-muted uppercase tracking-wider">Active</p>
                {active.map((a) => (
                  <AnnouncementRow key={a.id} ann={a} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            )}
            {inactive.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-[600] text-rk-muted uppercase tracking-wider">Inactive</p>
                {inactive.map((a) => (
                  <AnnouncementRow key={a.id} ann={a} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
