// In-memory rate limiter — process-level, suitable for single-instance deployments.
// For multi-instance prod, replace with a Redis-backed implementation.

const WINDOW_MS = 60 * 60 * 1_000; // 1 hour
const MAX_SUBMISSIONS = 5;

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Purge stale entries every 10 minutes to prevent unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 10 * 60 * 1_000).unref?.();

export function rateLimitKey(ipHash: string, sessionToken: string, listId: number): string {
  return `${ipHash}:${sessionToken}:${listId}`;
}

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_SUBMISSIONS - 1 };
  }

  if (entry.count >= MAX_SUBMISSIONS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_SUBMISSIONS - entry.count };
}
