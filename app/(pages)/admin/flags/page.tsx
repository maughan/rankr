"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, ToggleLeft, ToggleRight, Plus, Trash2, Loader2 } from "lucide-react";
import { getUserFromToken } from "@/lib/helpers";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
}

export default function AdminFlagsPage() {
  const { role } = getUserFromToken();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  if (role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A1220" }}>
        <p className="text-[14px] text-rk-muted">Page not found.</p>
      </div>
    );
  }

  const fetchFlags = async () => {
    const res = await fetch("/api/admin/flags");
    if (res.ok) setFlags(await res.json());
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { fetchFlags(); }, []);

  const toggle = async (flag: FeatureFlag) => {
    setToggling(flag.key);
    try {
      const res = await fetch(`/api/admin/flags/${flag.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) => f.key === flag.key ? { ...f, enabled: !f.enabled } : f)
        );
      }
    } finally {
      setToggling(null);
    }
  };

  const deleteFlag = async (key: string) => {
    setDeleting(key);
    try {
      const res = await fetch(`/api/admin/flags/${key}`, { method: "DELETE" });
      if (res.ok) setFlags((prev) => prev.filter((f) => f.key !== key));
    } finally {
      setDeleting(null);
    }
  };

  const addFlag = async () => {
    if (!newKey.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), enabled: false, description: newDesc.trim() || null }),
      });
      if (res.ok) {
        const flag = await res.json();
        setFlags((prev) => [...prev, flag].sort((a, b) => a.key.localeCompare(b.key)));
        setNewKey("");
        setNewDesc("");
        setShowAdd(false);
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-rk-stroke px-4 sm:px-8" style={{ backgroundColor: "#0A1220" }}>
        <div className="flex items-center justify-between h-12 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-rk-accent" />
            <span className="text-[15px] font-[600] text-rk-primary">Admin</span>
            <span className="text-rk-tertiary text-[13px] ml-1">/ Feature flags</span>
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
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-rk-muted">
            Flags default to <span className="text-green-400">enabled</span> if they don&apos;t exist. Changes propagate within 30 seconds.
          </p>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer flex-shrink-0"
          >
            <Plus size={12} />
            New flag
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="rounded-[12px] border border-rk-stroke bg-rk-surface p-4 flex flex-col gap-3">
            <p className="text-[13px] font-[500] text-rk-primary">New feature flag</p>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.replace(/\s/g, "_").toLowerCase())}
              placeholder="flag_key (snake_case)"
              className="bg-rk-row border border-rk-stroke rounded-[6px] px-3 py-2 text-[13px] text-rk-primary outline-none placeholder:text-rk-tertiary"
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="bg-rk-row border border-rk-stroke rounded-[6px] px-3 py-2 text-[13px] text-rk-primary outline-none placeholder:text-rk-tertiary"
            />
            <div className="flex gap-2">
              <button
                onClick={addFlag}
                disabled={adding || !newKey.trim()}
                className="px-3 py-1.5 text-[12px] font-[500] bg-rk-accent text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
              >
                {adding ? "Adding…" : "Add (disabled by default)"}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewKey(""); setNewDesc(""); }}
                className="px-3 py-1.5 text-[12px] font-[500] text-rk-secondary border border-rk-stroke rounded-[6px] hover:text-rk-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Flags list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={18} className="text-rk-muted animate-spin" />
          </div>
        ) : flags.length === 0 ? (
          <p className="text-[13px] text-rk-muted text-center py-8">No flags yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {flags.map((flag) => (
              <div
                key={flag.key}
                className="rounded-[10px] border border-rk-stroke bg-rk-surface px-4 py-3 flex items-center gap-3"
              >
                {/* Toggle */}
                <button
                  onClick={() => toggle(flag)}
                  disabled={toggling === flag.key}
                  className="flex-shrink-0 cursor-pointer disabled:opacity-40 transition-opacity"
                  aria-label={flag.enabled ? "Disable" : "Enable"}
                >
                  {toggling === flag.key ? (
                    <Loader2 size={22} className="text-rk-muted animate-spin" />
                  ) : flag.enabled ? (
                    <ToggleRight size={22} className="text-green-400" />
                  ) : (
                    <ToggleLeft size={22} className="text-rk-tertiary" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-[13px] font-[500] text-rk-primary">{flag.key}</code>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-[500] ${
                      flag.enabled
                        ? "bg-green-900/30 text-green-400"
                        : "bg-rk-row text-rk-tertiary"
                    }`}>
                      {flag.enabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                  {flag.description && (
                    <p className="text-[11px] text-rk-muted mt-0.5 truncate">{flag.description}</p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteFlag(flag.key)}
                  disabled={deleting === flag.key}
                  className="flex-shrink-0 text-rk-tertiary hover:text-red-400 transition-colors disabled:opacity-40 cursor-pointer"
                  aria-label="Delete flag"
                >
                  {deleting === flag.key
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
