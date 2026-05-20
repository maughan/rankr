"use client";

import { useState } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { makeQueryClient } from "@/lib/query/client";
import type { QueryClient } from "@tanstack/react-query";

// Only persist public, non-viewer-specific queries so one user never sees
// another user's data when sharing a device.
function shouldPersist(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return root === "list" || root === "sharedList";
}

// Module-level singletons — safe because this file is in the browser bundle only.
let browserQueryClient: QueryClient | undefined;

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
});

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState<QueryClient>(() => {
    if (typeof window === "undefined") return makeQueryClient();
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        buster: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => shouldPersist(query.queryKey),
        },
      }}
    >
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </PersistQueryClientProvider>
  );
}
