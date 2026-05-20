import type { QueryClient, QueryKey } from "@tanstack/react-query";

// Browser-only in-memory ETag cache: serialised query key → ETag value
const etagStore = new Map<string, string>();

function storeKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey);
}

export async function etagFetch<T>(
  url: string,
  queryKey: QueryKey,
  queryClient: QueryClient
): Promise<T> {
  const key = storeKey(queryKey);
  const cachedETag = etagStore.get(key);

  const headers: HeadersInit = {};
  if (cachedETag) headers["If-None-Match"] = cachedETag;

  const res = await fetch(url, { headers });

  if (res.status === 304) {
    const cached = queryClient.getQueryData<T>(queryKey);
    if (cached !== undefined) return cached;
    // Cache miss on 304 shouldn't happen — fall through to a clean fetch
    const fallback = await fetch(url);
    if (!fallback.ok) throw new Error(`HTTP ${fallback.status}`);
    const data = (await fallback.json()) as T;
    const tag = fallback.headers.get("ETag");
    if (tag) etagStore.set(key, tag);
    return data;
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const tag = res.headers.get("ETag");
  if (tag) etagStore.set(key, tag);

  return res.json() as Promise<T>;
}
