"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { getUserFromToken } from "@/lib/helpers";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const IS_ENABLED =
  !!KEY && KEY !== "phc_REPLACE_ME" && process.env.NODE_ENV !== "production";

if (typeof window !== "undefined" && IS_ENABLED && !posthog.__loaded) {
  posthog.init(KEY, {
    api_host: HOST,
    ui_host: "https://us.posthog.com",
    // Explicit capture only — no surprise PII from autocapture click events.
    autocapture: false,
    capture_pageview: false, // We fire manually below to get consistent props.
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    // Respect Do-Not-Track and Global Privacy Control.
    respect_dnt: true,
  });

  // Expose on window so the thin client wrapper can reach it without
  // importing posthog-js directly (avoids double-init in edge cases).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__posthog_instance = posthog;

  // Identify if already logged in (page hard-refresh while authed).
  const { id, username } = getUserFromToken();
  if (id) {
    posthog.identify(String(id), { username });
  }
}

// Inner component — uses usePostHog hook so it runs inside the provider.
// Wrapped in Suspense because useSearchParams requires it in App Router.
function PostHogPageTracker() {
  const ph = usePostHog();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!IS_ENABLED || !ph) return;
    const url =
      pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    ph.capture("$pageview", { $current_url: window.location.origin + url });
  }, [ph, pathname, searchParams]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!IS_ENABLED) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
