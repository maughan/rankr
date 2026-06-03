"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { baseApi } from "@/lib/api/baseApi";
import { S } from "@/app/content/strings";

interface MeResponse {
  id: number;
  username: string;
  email: string | null;
  display_name: string | null;
  bio: string | null;
  username_changed_at: string | null;
  isImpersonating?: boolean;
}

const RENAME_COOLDOWN_DAYS = 30;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function daysUntilRename(changedAt: string | null): number {
  if (!changedAt) return 0;
  const elapsed = (Date.now() - new Date(changedAt).getTime()) / 86_400_000;
  return Math.max(0, Math.ceil(RENAME_COOLDOWN_DAYS - elapsed));
}

// ── Shared input styles ───────────────────────────────────────────────────────

const inputCls =
  "bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-base sm:text-[13px] outline-none placeholder:text-rk-tertiary w-full focus:border-rk-muted transition-colors disabled:opacity-50";

const labelCls = "flex flex-col gap-1.5";
const labelTextCls = "text-[13px] text-rk-secondary";
const hintCls = "text-[11px] text-rk-tertiary";

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-rk-surface border border-rk-stroke rounded-[12px] overflow-hidden">
      <div className="px-5 py-4 border-b border-rk-stroke">
        <h2 className="text-[14px] font-[600] text-rk-primary">{title}</h2>
      </div>
      <div className="px-5 py-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

// ── Save button ───────────────────────────────────────────────────────────────

function SaveButton({
  loading,
  label = "Save",
}: {
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="self-start px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 cursor-pointer"
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {label}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [restartingOnboarding, setRestartingOnboarding] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Account form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: MeResponse) => {
        setMe(data);
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setUsername(data.username);
        setEmail(data.email ?? "");
      })
      .catch(() => {
        // Not authed — redirect to root
        window.location.href = "/";
      })
      .finally(() => setLoadingMe(false));
  }, []);

  const handleRestartOnboarding = async () => {
    setRestartingOnboarding(true);
    try {
      const res = await fetch("/api/onboarding/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "in_progress" }),
      });
      if (!res.ok) {
        toast.error("Something went wrong. Please try again.");
        return;
      }
      router.push("/onboarding/topic");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setRestartingOnboarding(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || null,
          bio: bio || null,
        }),
      });
      if (!res.ok) {
        toast.error(S.profile.saveFailed);
        return;
      }
      dispatch(baseApi.util.invalidateTags(["Lists"]));
      toast.success(S.profile.saved);
    } catch {
      toast.error(S.profile.saveFailed);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAccount = async (e: FormEvent) => {
    e.preventDefault();
    setUsernameError("");

    const isRename = username !== me?.username;
    if (isRename && !USERNAME_RE.test(username)) {
      setUsernameError("3–20 characters: letters, numbers, underscores only.");
      return;
    }

    setSavingAccount(true);
    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email }),
      });

      if (res.status === 429) {
        const msg = await res.text();
        setUsernameError(msg);
        return;
      }
      if (res.status === 422) {
        const msg = await res.text();
        setUsernameError(msg);
        return;
      }
      if (!res.ok) {
        toast.error(S.profile.accountSaveFailed);
        return;
      }

      if (isRename) {
        setMe((prev) =>
          prev
            ? {
                ...prev,
                username,
                username_changed_at: new Date().toISOString(),
              }
            : prev
        );
        toast.success(S.profile.accountSaved);
      } else {
        toast.success(S.profile.accountSaved);
      }
      dispatch(baseApi.util.resetApiState());
    } catch {
      toast.error(S.profile.accountSaveFailed);
    } finally {
      setSavingAccount(false);
    }
  };

  if (loadingMe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="text-rk-muted animate-spin" />
      </div>
    );
  }

  const renameDaysLeft = daysUntilRename(me?.username_changed_at ?? null);
  const renameBlocked = renameDaysLeft > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/u/${me?.username ?? ""}`}
            className="text-rk-muted hover:text-rk-secondary transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-[18px] font-[600] text-rk-primary">
            Profile settings
          </h1>
        </div>

        {/* Profile section */}
        <SectionCard title="Your profile">
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <label className={labelCls}>
              <span className={labelTextCls}>Display name</span>
              <input
                className={inputCls}
                type="text"
                maxLength={50}
                placeholder={me?.username ?? ""}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <span className={hintCls}>
                Shown instead of your username. Leave blank to use @
                {me?.username}.
              </span>
            </label>

            <label className={labelCls}>
              <span className={labelTextCls}>Bio</span>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                maxLength={200}
                placeholder="Say something about yourself…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              <span className={hintCls}>{bio.length}/200</span>
            </label>

            <SaveButton loading={savingProfile} />
          </form>
        </SectionCard>

        {/* Account section */}
        <SectionCard title="Your account">
          <form onSubmit={handleSaveAccount} className="flex flex-col gap-4">
            <label className={labelCls}>
              <span className={labelTextCls}>Username</span>
              <input
                className={inputCls}
                type="text"
                maxLength={20}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameError("");
                }}
                disabled={renameBlocked}
              />
              {renameBlocked ? (
                <span className={hintCls}>
                  Next rename available in {renameDaysLeft} day
                  {renameDaysLeft !== 1 ? "s" : ""}.
                </span>
              ) : (
                <span className={hintCls}>
                  3–20 characters · letters, numbers, underscores · 30-day
                  cooldown after changing.
                </span>
              )}
              {usernameError && (
                <span className="text-[12px] text-red-400">
                  {usernameError}
                </span>
              )}
            </label>

            <label className={labelCls}>
              <span className={labelTextCls}>Email</span>
              {me?.isImpersonating ? (
                <div className={`${inputCls} flex items-center gap-2 text-rk-tertiary select-none`}>
                  <span>•••••••••••••</span>
                  <span className="text-[11px] text-rk-muted ml-auto">(redacted in impersonation)</span>
                </div>
              ) : (
                <input
                  className={inputCls}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                />
              )}
            </label>

            <div className="flex items-center gap-3">
              <SaveButton loading={savingAccount} />
              {/* <button
                type="button"
                onClick={() => dispatch(uiActions.openPasswordModal())}
                className="px-4 py-2 text-[13px] text-rk-muted border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-secondary transition-colors cursor-pointer"
              >
                Change password
              </button> */}
            </div>
          </form>
        </SectionCard>

        {/* Onboarding re-entry */}
        <SectionCard title="Get started">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] text-rk-secondary">
              Want a quick tour? We&apos;ll walk you through ranking your first list.
            </p>
            <button
              type="button"
              onClick={handleRestartOnboarding}
              disabled={restartingOnboarding}
              className="shrink-0 px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {restartingOnboarding && (
                <Loader2 size={13} className="animate-spin" />
              )}
              Show me around
            </button>
          </div>
        </SectionCard>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-4 text-[12px] text-rk-tertiary">
          <Link
            href={`/u/${me?.username ?? ""}`}
            className="underline underline-offset-2 hover:text-rk-muted transition-colors"
          >
            View your public profile →
          </Link>
          <span>·</span>
          <Link
            href="/settings/account"
            className="underline underline-offset-2 hover:text-rk-muted transition-colors"
          >
            Privacy &amp; data →
          </Link>
        </div>
      </div>
    </div>
  );
}
