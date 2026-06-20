"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CancelDeletionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/delete-account/cancel", { method: "POST" });
      if (!res.ok) {
        toast.error("Couldn't cancel deletion. Please try again.");
        return;
      }
      toast.success("Account deletion cancelled. Please sign in again.");
      router.replace("/login");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0A1220" }}>
      <div className="bg-rk-surface border border-rk-stroke rounded-[12px] p-8 max-w-md w-full flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />
          <h1 className="text-[18px] font-[600] text-rk-primary">Account pending deletion</h1>
        </div>

        <p className="text-[14px] text-rk-secondary leading-relaxed">
          Your account is scheduled for permanent deletion. Everything will be gone after that date — your profile, lists, and settings.
        </p>

        <p className="text-[13px] text-rk-muted leading-relaxed">
          Changed your mind? Cancel now to restore access immediately. You can always delete again later.
        </p>

        <div className="flex flex-col gap-3 pt-1">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-2.5 text-[14px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Cancel deletion — keep my account
          </button>
          <button
            onClick={() => { document.cookie = "auth_token=; path=/; max-age=0"; router.replace("/login"); }}
            className="w-full py-2.5 text-[13px] text-rk-muted border border-rk-stroke rounded-[8px] hover:text-rk-secondary transition-colors cursor-pointer"
          >
            Sign out — let deletion proceed
          </button>
        </div>
      </div>
    </div>
  );
}
