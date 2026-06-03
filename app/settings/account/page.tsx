"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Download, Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { S } from "@/app/content/strings";

interface ExportRequest {
  id: number;
  status: "pending" | "processing" | "ready" | "failed" | "expired";
  download_url: string | null;
  expires_at: string | null;
  download_count: number;
  requested_at: string;
  completed_at: string | null;
}

interface MeResponse {
  username: string;
  email: string | null;
  deletion_scheduled_at: string | null;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  "bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-sm outline-none placeholder:text-rk-tertiary w-full focus:border-rk-muted transition-colors disabled:opacity-50";

function SectionCard({ title, danger, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-rk-surface rounded-[12px] overflow-hidden border ${danger ? "border-red-900/40" : "border-rk-stroke"}`}>
      <div className="px-5 py-4 border-b border-rk-stroke">
        <h2 className="text-[14px] font-[600] text-rk-primary">{title}</h2>
      </div>
      <div className="px-5 py-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

// ── Export section ────────────────────────────────────────────────────────────

function ExportSection() {
  const [exportReq, setExportReq] = useState<ExportRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetch("/api/user/data-export")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setExportReq(d.request); })
      .finally(() => setLoading(false));
  }, []);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const res = await fetch("/api/user/data-export", { method: "POST" });
      const data = await res.json();
      setExportReq(data.request);
      toast.success(S.dataExport.requestSent);
    } catch {
      toast.error(S.dataExport.requestFailed);
    } finally {
      setRequesting(false);
    }
  };

  const isExpired = exportReq?.status === "expired" ||
    (exportReq?.expires_at && new Date(exportReq.expires_at) < new Date());
  const isReady = exportReq?.status === "ready" && !isExpired;
  const isInFlight = exportReq && ["pending", "processing"].includes(exportReq.status);

  return (
    <SectionCard title="Download your data">
      <p className="text-[13px] text-rk-secondary leading-relaxed">
        Get a copy of everything we hold on you — your profile, lists, rankings, follows, and more — packaged as JSON files in a zip archive. Useful if you want a backup or you're moving on.
      </p>

      {loading ? (
        <Loader2 size={14} className="animate-spin text-rk-muted" />
      ) : isReady && exportReq ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-[8px] border border-green-900/40 bg-green-900/10 px-3 py-2.5">
            <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-[12px] font-[500] text-green-300">Export ready</p>
              <p className="text-[11px] text-green-400/70">
                Link expires {exportReq.expires_at ? fmt(exportReq.expires_at) : "soon"}.
              </p>
            </div>
          </div>
          <a
            href={exportReq.download_url!}
            download
            className="self-start flex items-center gap-2 px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
          >
            <Download size={13} />
            {S.dataExport.downloadLabel}
          </a>
        </div>
      ) : isInFlight ? (
        <div className="flex items-center gap-2 text-[13px] text-rk-muted">
          <Loader2 size={13} className="animate-spin" />
          Processing your export — we'll email you when it's ready.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {isExpired && (
            <p className="text-[12px] text-rk-muted">{S.dataExport.expiredLabel}</p>
          )}
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="self-start flex items-center gap-2 px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {requesting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Request data download
          </button>
          <p className="text-[11px] text-rk-tertiary">
            One export per 14 days. Link valid for 7 days once ready.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

// ── Deletion section ──────────────────────────────────────────────────────────

function DeletionSection({ me }: { me: MeResponse }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const pendingDeletion = me.deletion_scheduled_at;

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (usernameInput !== me.username) {
      toast.error(S.accountDeletion.usernameTypo);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, reason: reason || null }),
      });
      if (res.status === 403) {
        toast.error(S.accountDeletion.wrongPassword);
        return;
      }
      if (!res.ok) {
        toast.error(S.accountDeletion.initFailed);
        return;
      }
      // Sign out immediately — account is now suspended
      document.cookie = "auth_token=; path=/; max-age=0";
      toast.success(S.accountDeletion.initiated);
      router.replace("/login");
    } catch {
      toast.error(S.accountDeletion.initFailed);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/user/delete-account/cancel", { method: "POST" });
      if (!res.ok) {
        toast.error(S.accountDeletion.cancelFailed);
        return;
      }
      toast.success(S.accountDeletion.cancelled);
      router.replace("/login");
    } catch {
      toast.error(S.accountDeletion.cancelFailed);
    } finally {
      setCancelling(false);
    }
  };

  if (pendingDeletion) {
    return (
      <SectionCard title="Delete my account" danger>
        <div className="flex items-start gap-3 rounded-[8px] border border-amber-800/40 bg-amber-900/10 px-3 py-3">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-[500] text-amber-300">Deletion scheduled</p>
            <p className="text-[12px] text-amber-400/80 mt-0.5">
              Your account will be permanently deleted on{" "}
              <strong>{fmt(pendingDeletion)}</strong> — in {daysLeft(pendingDeletion)} day{daysLeft(pendingDeletion) !== 1 ? "s" : ""}.
              After that, this cannot be undone.
            </p>
          </div>
        </div>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="self-start flex items-center gap-2 px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {cancelling && <Loader2 size={13} className="animate-spin" />}
          Cancel deletion — keep my account
        </button>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Delete my account" danger>
      <p className="text-[13px] text-rk-secondary leading-relaxed">
        Permanently removes your profile, lists, settings, and follows. Your rankings on public lists become anonymous — they stay to preserve other rankers' data. You'll have 30 days to change your mind before anything is gone for good.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="self-start flex items-center gap-2 px-4 py-2 text-[13px] font-[500] bg-red-700/80 text-white rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Trash2 size={13} />
          Delete my account
        </button>
      ) : (
        <form onSubmit={handleDelete} className="flex flex-col gap-4">
          <div className="rounded-[8px] border border-red-900/40 bg-red-900/10 px-3 py-3 text-[12px] text-red-300 leading-relaxed">
            This schedules permanent deletion in 30 days. You'll be signed out immediately and emailed a cancellation link. After 30 days, your account cannot be recovered.
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-rk-secondary">
              Type your username (<strong className="text-rk-primary">@{me.username}</strong>) to confirm
            </span>
            <input
              className={inputCls}
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder={me.username}
              autoComplete="off"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-rk-secondary">Confirm your password</span>
            <input
              className={inputCls}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-rk-secondary">Why are you leaving? <span className="text-rk-tertiary">(optional)</span></span>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Anything you'd like us to know…"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={deleting || usernameInput !== me.username || !password}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-[500] bg-red-700 text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              {deleting && <Loader2 size={13} className="animate-spin" />}
              Delete account
            </button>
            <button
              type="button"
              onClick={() => { setShowConfirm(false); setUsernameInput(""); setPassword(""); setReason(""); }}
              className="px-4 py-2 text-[13px] text-rk-muted border border-rk-stroke rounded-[8px] hover:text-rk-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setMe)
      .catch(() => { window.location.href = "/"; })
      .finally(() => setLoadingMe(false));
  }, []);

  if (loadingMe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="text-rk-muted animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/settings/profile" className="text-rk-muted hover:text-rk-secondary transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-[18px] font-[600] text-rk-primary">Privacy & data</h1>
        </div>

        <ExportSection />

        {me && <DeletionSection me={me} />}
      </div>
    </div>
  );
}
