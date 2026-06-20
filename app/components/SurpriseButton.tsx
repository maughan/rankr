"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { S } from "@/app/content/strings";
import { trackEvent } from "@/lib/analytics/client";
import { E } from "@/lib/analytics/events";

interface Props {
  className?: string;
  iconSize?: number;
}

export function SurpriseButton({ className, iconSize = 14 }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    trackEvent(E.SURPRISE_ME_CLICKED);
    try {
      const res = await fetch("/api/surprise");
      if (!res.ok) return;
      const { url } = await res.json();
      if (url) router.push(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-current/30 border-t-current animate-spin flex-shrink-0" />
      ) : (
        <Shuffle size={iconSize} className="flex-shrink-0" />
      )}
      {S.payoff.surpriseMe}
    </button>
  );
}
