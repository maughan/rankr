"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, Megaphone } from "lucide-react";
import { usePathname } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { E } from "@/lib/analytics/events";

type Severity = "info" | "warning" | "critical";
type Audience = "all" | "authed" | "anon";

interface ActiveAnnouncement {
  id: number;
  message: string;
  severity: Severity;
  audience: Audience;
  cta_label: string | null;
  cta_url: string | null;
}

const SEVERITY_STYLES: Record<Severity, { bg: string; border: string; text: string; icon: string }> = {
  info: {
    bg: "rgba(74,138,232,0.10)",
    border: "rgba(74,138,232,0.25)",
    text: "#93B8F7",
    icon: "#4A8AE8",
  },
  warning: {
    bg: "rgba(217,119,6,0.10)",
    border: "rgba(217,119,6,0.30)",
    text: "#FCD34D",
    icon: "#D97706",
  },
  critical: {
    bg: "rgba(220,38,38,0.12)",
    border: "rgba(220,38,38,0.35)",
    text: "#FCA5A5",
    icon: "#DC2626",
  },
};

const HIDDEN_PREFIXES = ["/admin", "/onboarding"];
const DISMISS_PREFIX = "rk_ann_dismissed_";

function isAuthed(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("auth_token="));
}

export default function AnnouncementBanner() {
  const pathname = usePathname();
  const ph = usePostHog();
  const [ann, setAnn] = useState<ActiveAnnouncement | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    fetch("/api/announcements/active")
      .then((r) => r.json())
      .then((data: { announcement: ActiveAnnouncement | null }) => {
        if (!data.announcement) return;
        const a = data.announcement;

        // Audience filter
        if (a.audience === "authed" && !isAuthed()) return;
        if (a.audience === "anon" && isAuthed()) return;

        // Dismissed?
        if (localStorage.getItem(`${DISMISS_PREFIX}${a.id}`) === "1") return;

        setAnn(a);
      })
      .catch(() => {});
  }, []);

  // Fire shown event once when ann first appears
  useEffect(() => {
    if (!ann || shownRef.current) return;
    shownRef.current = true;
    ph?.capture(E.ANNOUNCEMENT_SHOWN, { announcement_id: ann.id, severity: ann.severity });
  }, [ann, ph]);

  const isHidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  if (!ann || isHidden) return null;

  const s = SEVERITY_STYLES[ann.severity];

  const dismiss = () => {
    localStorage.setItem(`${DISMISS_PREFIX}${ann.id}`, "1");
    ph?.capture(E.ANNOUNCEMENT_DISMISSED, { announcement_id: ann.id, severity: ann.severity });
    setAnn(null);
  };

  const handleCtaClick = () => {
    ph?.capture(E.ANNOUNCEMENT_CTA_CLICKED, { announcement_id: ann.id });
  };

  return (
    <div
      className="w-full px-4 py-2.5 flex items-center gap-3"
      style={{ backgroundColor: s.bg, borderBottom: `1px solid ${s.border}` }}
    >
      <Megaphone size={13} style={{ color: s.icon, flexShrink: 0 }} />
      <p style={{ color: s.text }} className="flex-1 text-[13px] leading-snug text-center">
        {ann.message}
        {ann.cta_label && ann.cta_url && (
          <>
            {" "}
            <Link
              href={ann.cta_url}
              onClick={handleCtaClick}
              className="font-[600] underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: s.icon }}
            >
              {ann.cta_label}
            </Link>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="flex-shrink-0 hover:opacity-70 transition-opacity cursor-pointer"
        style={{ color: s.text }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
