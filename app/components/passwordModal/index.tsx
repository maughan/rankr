"use client";

import { FormEvent, useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { uiActions } from "@/lib/store/uiSlice";
import { baseApi } from "@/lib/api/baseApi";
import Modal from "@/app/components/modal";

export default function PasswordModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.modals.password);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dispatch(uiActions.closePasswordModal());
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  const handleSuccess = () => {
    dispatch(uiActions.closePasswordModal());
    dispatch(baseApi.util.resetApiState());
    dispatch(uiActions.openAuthModal());
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `${data.get("email")}`.toLowerCase(),
          password: data.get("password"),
        }),
      });
      if (!res.ok) {
        toast.error("Something went wrong.");
        return;
      }
      handleSuccess();
      toast.success("Password reset successfully.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-[13px] outline-none placeholder:text-rk-tertiary w-full focus:border-rk-muted transition-colors";

  return (
    <Modal
      open={open}
      handleClose={() => dispatch(uiActions.closePasswordModal())}
    >
      <div className="p-6 pt-10 flex flex-col gap-5">
        <form
          key="signup"
          onSubmit={handleResetPassword}
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
            Reset password
          </button>
        </form>
      </div>
    </Modal>
  );
}
