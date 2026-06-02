"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { OnboardingTopic } from "@/lib/onboardingTopics";
import { CategoryIcon } from "@/app/components/item/CategoryIcon";
import { trackEvent } from "@/lib/analytics/client";
import { E } from "@/lib/analytics/events";
import ProgressDots from "@/app/components/ProgressDots";

const TOPIC_CATEGORY: Record<string, string> = {
  "chocolate": "food",
  "fast-food":  "food",
  "pizza":      "food",
  "pokemon":    "gaming",
  "gaming":     "gaming",
  "marvel":     "movies",
  "disney":     "movies",
  "streaming":  "tv",
};

export default function OnboardingTopicPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<OnboardingTopic[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/starters")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: OnboardingTopic[]) => setTopics(data))
      .catch(() => {/* show nothing; user can still skip */})
      .finally(() => setLoaded(true));
  }, []);

  const handleSelect = async (topic: OnboardingTopic) => {
    if (selecting) return;
    setSelecting(topic.slug);
    try {
      await fetch("/api/onboarding/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "in_progress", topic: topic.slug }),
      });

      const res = await fetch(`/api/onboarding/starters/${topic.slug}`);
      if (!res.ok) throw new Error("no starter");
      const { list_id } = await res.json() as { list_id: number };

      trackEvent(E.ONBOARDING_TOPIC_PICKED, { topic: topic.slug });
      trackEvent(E.ONBOARDING_RANKING_STARTED);

      router.push(`/onboarding/rank?list=${list_id}`);
    } catch {
      setSelecting(null);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    await fetch("/api/onboarding/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "skipped", at_step: "topic" }),
    }).catch(() => {/* best-effort */});
    router.push("/feed");
  };

  return (
    <div className="min-h-screen bg-rk-page flex flex-col">
      {/* Nav */}
      <div className="sticky top-0 z-20 bg-rk-page border-b border-rk-stroke px-4 sm:px-8">
        <div className="flex justify-between items-center h-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-[3px] bg-rk-accent flex-shrink-0" />
            <span className="text-[17px] font-[500] text-rk-primary tracking-tight">
              tierstack.dev
            </span>
          </Link>
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            className="text-[13px] text-rk-muted hover:text-rk-secondary transition-colors cursor-pointer disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-8 py-10 max-w-2xl mx-auto w-full flex flex-col gap-8">
        {/* Progress dots */}
        <ProgressDots step={1} />

        {/* Heading */}
        <div className="text-center flex flex-col gap-2">
          <h1
            className="text-rk-primary font-[600] leading-tight"
            style={{ fontSize: 28, letterSpacing: "-0.5px" }}
          >
            What are you into?
          </h1>
          <p className="text-[14px] text-rk-muted">
            Pick a topic and rank your first list. Takes about 2 minutes.
          </p>
        </div>

        {/* Topic grid */}
        {!loaded ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="text-rk-muted animate-spin" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-rk-muted text-[13px]">No topics available right now.</p>
            <button
              onClick={handleSkip}
              className="mt-4 text-[13px] text-rk-accent hover:opacity-80 transition-opacity"
            >
              Go to the feed instead →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topics.map((topic) => {
              const isLoading = selecting === topic.slug;
              const isDisabled = !!selecting && !isLoading;
              return (
                <button
                  key={topic.slug}
                  type="button"
                  onClick={() => handleSelect(topic)}
                  disabled={!!selecting}
                  className="relative flex flex-col items-center gap-3 rounded-[12px] border border-rk-stroke bg-rk-surface p-4 text-left hover:border-rk-muted transition-colors cursor-pointer disabled:opacity-60 group"
                >
                  {/* Accent tint on hover */}
                  <div
                    className="absolute inset-0 rounded-[12px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ backgroundColor: `${topic.color}10` }}
                  />

                  <div
                    className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${topic.color}22`, color: topic.color }}
                  >
                    <CategoryIcon slug={TOPIC_CATEGORY[topic.slug] ?? "other"} size={22} />
                  </div>
                  <div className="relative z-10 flex flex-col gap-0.5 text-center">
                    <p className="text-[13px] font-[600] text-rk-primary leading-snug">
                      {topic.displayName}
                    </p>
                    <p className="text-[11px] text-rk-muted leading-snug">
                      {topic.description}
                    </p>
                  </div>

                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-rk-surface/80">
                      <Loader2 size={16} className="text-rk-accent animate-spin" />
                    </div>
                  )}
                  {isDisabled && (
                    <div className="absolute inset-0 rounded-[12px] bg-rk-surface/50 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
