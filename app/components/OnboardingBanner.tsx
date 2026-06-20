"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

const DISMISS_KEY = "rk_ob_banner_dismissed";

export default function OnboardingBanner({
  initialObState,
}: {
  initialObState: string | undefined;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (initialObState !== "in_progress") return;
    if (pathname.startsWith("/onboarding")) return;
    const dismissed = sessionStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, [initialObState, pathname]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="flex items-center justify-between gap-3 bg-rk-surface border border-rk-stroke rounded-[12px] px-4 py-3 shadow-xl">
        <p className="text-[13px] text-rk-secondary">
          Still getting started?
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/onboarding/topic"
            className="text-[13px] font-[600] text-rk-accent hover:opacity-80 transition-opacity"
            onClick={dismiss}
          >
            Continue
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-rk-muted hover:text-rk-secondary transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
