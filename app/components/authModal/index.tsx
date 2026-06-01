"use client";

import { FormEvent, useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { baseApi } from "@/lib/api/baseApi";
import Modal from "@/app/components/modal";
import { S } from "@/app/content/strings";
import { usePostHog } from "posthog-js/react";
import { getUserFromToken } from "@/lib/helpers";
import { E } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

type Tab = "login" | "signup";

export default function AuthModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.modals.auth);
  const router = useRouter();
  const pathname = usePathname();
  const ph = usePostHog();

  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dispatch(uiActions.closeAuthModal());
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  const handleSuccess = (overridePath?: string) => {
    dispatch(uiActions.closeAuthModal());
    dispatch(baseApi.util.resetApiState());
    if (overridePath) {
      router.push(overridePath);
    } else if (pathname === "/") {
      router.push("/feed");
    }
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `${data.get("email")}`.toLowerCase(),
          password: data.get("password"),
        }),
      });
      if (!res.ok) {
        toast.error(S.auth.loginFailed);
        return;
      }
      // Identify AFTER the cookie is set — getUserFromToken reads it synchronously.
      const { id, username } = getUserFromToken();
      if (id && ph) ph.identify(String(id), { username });
      handleSuccess();
      toast.success(S.auth.loginSuccess);
    } catch {
      toast.error(S.auth.loginError);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    trackEvent(E.SIGNUP_STARTED);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `${data.get("email")}`.toLowerCase(),
          username: data.get("username"),
          password: data.get("password"),
        }),
      });
      if (!res.ok) {
        toast.error(S.auth.signupTaken);
        return;
      }
      const result = await res.json() as {
        onboarding_state: "pending" | "in_progress" | "completed" | "skipped";
        onboarding_list_id?: number;
      };
      // Identify with merge — this stitches the anonymous pre-signup session
      // into the new authenticated user record in PostHog.
      const { id, username } = getUserFromToken();
      if (id && ph) ph.identify(String(id), { username });
      if (result.onboarding_state === "pending") {
        handleSuccess("/onboarding/topic");
      } else if (result.onboarding_state === "in_progress" && result.onboarding_list_id) {
        handleSuccess(`/onboarding/rank?list=${result.onboarding_list_id}`);
      } else {
        handleSuccess(); // completed / skipped → normal flow
      }
      toast.success(S.auth.signupSuccess);
    } catch {
      toast.error(S.auth.signupError);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = () => {
    dispatch(uiActions.closeAuthModal());
    dispatch(uiActions.openPasswordModal());
  };

  const inputCls =
    "bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-base sm:text-[13px] outline-none placeholder:text-rk-tertiary w-full focus:border-rk-muted transition-colors";

  return (
    <Modal open={open} handleClose={() => dispatch(uiActions.closeAuthModal())}>
      <div className="p-6 pt-10 flex flex-col gap-5">
        {/* Tab toggle */}
        <div
          className="flex gap-1 rounded-[8px] p-1"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setShowPassword(false);
              }}
              className={`flex-1 py-1.5 text-[13px] font-[500] rounded-[6px] transition-colors cursor-pointer ${
                tab === t
                  ? "bg-rk-surface text-rk-primary"
                  : "text-rk-muted hover:text-rk-secondary"
              }`}
            >
              {t === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form
            key="login"
            onSubmit={handleLogin}
            className="flex flex-col gap-3"
          >
            <input
              className={inputCls}
              type="email"
              name="email"
              placeholder="Email"
              autoComplete="email"
              required
              autoFocus
            />

            <div className="relative">
              <input
                className={inputCls}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rk-muted hover:text-rk-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <p
              onClick={handlePasswordReset}
              className="text-[13px] font-[600] pl-1 cursor-pointer w-fit hover:opacity-70"
            >
              Trouble signing in?
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 px-4 py-2.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
              )}
              Log in
            </button>
          </form>
        ) : (
          <form
            key="signup"
            onSubmit={handleSignup}
            className="flex flex-col gap-3"
          >
            <input
              className={inputCls}
              type="email"
              name="email"
              placeholder="Email"
              autoComplete="email"
              required
              autoFocus
            />

            <input
              className={inputCls}
              type="text"
              name="username"
              placeholder="Username"
              autoComplete="username"
              required
            />

            <div className="relative">
              <input
                className={inputCls}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                autoComplete="new-password"
                pattern="(?=.*[A-Z])(?=.*\d).{8,}"
                title="At least 8 characters, one uppercase letter, one number"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rk-muted hover:text-rk-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <p className="text-[11px] text-rk-tertiary -mt-1">
              Min 8 chars · one uppercase · one number
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 px-4 py-2.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
              )}
              Create account
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
