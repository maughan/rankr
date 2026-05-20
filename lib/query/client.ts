import { cache } from "react";
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  });
}

// Server: one QueryClient per request — React's cache() is request-scoped,
// so this never leaks data between concurrent users.
export const getServerQueryClient = cache(makeQueryClient);
