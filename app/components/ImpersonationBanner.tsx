"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, Clock, LogOut, TimerReset, AlertTriangle } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { E } from "@/lib/analytics/events";

interface Props {
  targetUsername: string;
  targetUserId: number;
  startedAt: number; // unix ms
  expiresAt: number; // unix ms
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function ImpersonationBanner({
  targetUsername,
  targetUserId,
  startedAt,
  expiresAt,
}: Props) {
  const router = useRouter();
  const ph = usePostHog();
  const [msRemaining, setMsRemaining] = useState(() => expiresAt - Date.now());
  const [exiting, setExiting] = useState(false);
  const [extending, setExtending] = useState(false);
  const [currentExpiresAt, setCurrentExpiresAt] = useState(expiresAt);
  const expiredRef = useRef(false);

  // Tick every second.
  useEffect(() => {
    const tick = () => {
      const remaining = currentExpiresAt - Date.now();
      setMsRemaining(remaining);

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        handleEnd("expiry");
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentExpiresAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Viewport border effect — vivid red frame around the whole page.
  useEffect(() => {
    document.documentElement.style.setProperty("--imp-border", "2px solid #DC2626");
    document.body.style.outline = "2px solid #DC2626";
    document.body.style.outlineOffset = "-2px";
    return () => {
      document.body.style.outline = "";
      document.body.style.outlineOffset = "";
    };
  }, []);

  const handleEnd = useCallback(
    async (endedBy: "manual" | "expiry" = "manual") => {
      if (exiting) return;
      setExiting(true);
      try {
        await fetch("/api/impersonation/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endedBy }),
        });

        const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
        ph?.capture(E.IMPERSONATION_ENDED, {
          target_user_id: targetUserId,
          duration_seconds: durationSeconds,
          ended_by: endedBy,
        });

        router.push("/admin");
        router.refresh();
      } catch {
        setExiting(false);
      }
    },
    [exiting, ph, router, startedAt, targetUserId]
  );

  const handleExtend = async () => {
    setExtending(true);
    try {
      const res = await fetch("/api/impersonation/extend", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCurrentExpiresAt(data.expiresAt);
        expiredRef.current = false;
        ph?.capture(E.IMPERSONATION_EXTENDED, { target_user_id: targetUserId });
      }
    } finally {
      setExtending(false);
    }
  };

  const isExpiringSoon = msRemaining < 2 * 60 * 1000; // <2 min
  const bannerBg = isExpiringSoon ? "#7C1D1D" : "#991B1B";
  const bannerBorder = isExpiringSoon ? "#FCA5A5" : "#DC2626";

  return (
    <div
      className="w-full px-4 py-2.5 flex items-center gap-3 z-[100] select-none"
      style={{
        backgroundColor: bannerBg,
        borderBottom: `1px solid ${bannerBorder}`,
        position: "sticky",
        top: 0,
      }}
    >
      {/* Left: identity */}
      <div className="flex items-center gap-2 shrink-0">
        <Eye size={14} className="text-red-200" />
        <span className="text-[12px] font-[600] text-red-100">
          Viewing as @{targetUsername}
        </span>
      </div>

      {/* Middle: countdown */}
      <div className="flex-1 flex items-center justify-center gap-1.5">
        {isExpiringSoon && <AlertTriangle size={12} className="text-red-300 animate-pulse" />}
        <Clock size={12} className="text-red-300" />
        <span
          className="text-[12px] font-[500] tabular-nums"
          style={{ color: isExpiringSoon ? "#FCA5A5" : "#FECACA" }}
        >
          {formatCountdown(msRemaining)}
        </span>
        <button
          onClick={handleExtend}
          disabled={extending}
          title="Extend 30 minutes"
          className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] text-red-300 hover:text-red-100 hover:bg-red-900/40 transition-colors cursor-pointer disabled:opacity-40"
        >
          <TimerReset size={11} />
          Extend
        </button>
      </div>

      {/* Right: exit */}
      <button
        onClick={() => handleEnd("manual")}
        disabled={exiting}
        className="flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-[6px] text-[12px] font-[600] bg-red-800 text-red-100 border border-red-600/50 hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40"
      >
        <LogOut size={12} />
        {exiting ? "Exiting…" : "Exit impersonation"}
      </button>
    </div>
  );
}
