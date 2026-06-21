"use client";

// Client-side PostHog capture wrapper.
// Import posthog-js lazily so this module is safe to import anywhere on the client.

import type { EventName, EventProperties } from "./events";

function getPostHog() {
  if (typeof window === "undefined") return null;
  // posthog-js attaches itself to window after the provider initialises it.
   
  const ph = (window as any).__posthog_instance;
  return ph ?? null;
}

export function trackEvent<T extends EventName>(
  name: T,
  ...args: EventProperties[T] extends Record<string, never>
    ? []
    : [properties: EventProperties[T]]
): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.capture(name, args[0] ?? {});
}
