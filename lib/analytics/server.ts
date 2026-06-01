// Server-side PostHog capture wrapper (posthog-node).
// Safe to import in any Route Handler or Server Component.
// Lazily inits the client so the module can be imported without side-effects
// at build time (no DB/network calls on import).

import { PostHog } from "posthog-node";
import type { EventName, EventProperties } from "./events";

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  // Skip in dev/test or when the key is the placeholder.
  if (!key || key === "phc_REPLACE_ME" || process.env.NODE_ENV !== "production") {
    return null;
  }

  if (!_client) {
    _client = new PostHog(key, {
      host: host ?? "https://us.i.posthog.com",
      // Flush immediately on Vercel serverless — functions exit before the
      // default 30-second batch window. Each capture is a lightweight POST.
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

/**
 * Fire a server-side PostHog event.
 *
 * `distinctId` should be the authenticated user's numeric ID as a string,
 * or an anonymous identifier (e.g. IP hash) when the user is not logged in.
 * Never put PII into `properties` — use IDs only.
 */
export async function captureServer<T extends EventName>(
  distinctId: string,
  name: T,
  ...args: EventProperties[T] extends Record<string, never>
    ? []
    : [properties: EventProperties[T]]
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  ph.capture({ distinctId, event: name, properties: args[0] ?? {} });

  // Flush synchronously so the event reaches PostHog before the Vercel
  // function process exits. _shutdown() drains the queue and closes
  // the HTTP connection; it's safe to call on every request at flushAt=1.
  await ph._shutdown();
}

/**
 * Identify a user server-side (rare — prefer client-side identify for merging
 * anonymous pre-signup activity). Use after signup to set immutable person props.
 */
export async function identifyServer(
  distinctId: string,
  properties: {
    username?: string;
    signed_up_at?: string;
  }
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  ph.identify({
    distinctId,
    properties: {
      $set_once: {
        signed_up_at: properties.signed_up_at,
      },
      $set: {
        username: properties.username,
      },
    },
  });

  await ph._shutdown();
}
