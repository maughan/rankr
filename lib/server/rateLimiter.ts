// Generic in-memory rate limiter — one independent counter per limiter
// instance, parameterised by window and max. Process-level; for multi-instance
// prod, back it with Redis. Use one module-level instance per route.

interface Entry {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  // Returns true if the request is allowed, false if the key is over its limit.
  check(key: string): boolean;
}

export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  now?: () => number;
}): RateLimiter {
  const now = opts.now ?? (() => Date.now());
  const store = new Map<string, Entry>();

  // Purge stale entries periodically so the map can't grow unbounded.
  setInterval(() => {
    const t = now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= t) store.delete(key);
    }
  }, 10 * 60 * 1_000).unref?.();

  return {
    check(key: string): boolean {
      const t = now();
      const entry = store.get(key);

      if (!entry || entry.resetAt <= t) {
        store.set(key, { count: 1, resetAt: t + opts.windowMs });
        return true;
      }
      if (entry.count >= opts.max) return false;

      entry.count += 1;
      return true;
    },
  };
}
