"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { baseApi } from "@/lib/api/baseApi";
import Modal from "@/app/components/modal";

type Tab = "login" | "signup";

export default function AuthModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.modals.auth);

  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSuccess = () => {
    dispatch(uiActions.closeAuthModal());
    dispatch(baseApi.util.resetApiState());
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
        toast.error("Invalid email or password.");
        return;
      }
      handleSuccess();
      toast.success("Logged in.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
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
        toast.error("Email or username already taken.");
        return;
      }
      handleSuccess();
      toast.success("Account created.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-[13px] outline-none placeholder:text-rk-tertiary w-full focus:border-rk-muted transition-colors";

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
              required
              autoFocus
            />

            <div className="relative">
              <input
                className={inputCls}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
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
              required
              autoFocus
            />

            <input
              className={inputCls}
              type="text"
              name="username"
              placeholder="Username"
              required
            />

            <div className="relative">
              <input
                className={inputCls}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
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
