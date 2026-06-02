import { cache } from "react";
import { QueryClient, QueryCache } from "@tanstack/react-query";

function is401(error: Error) {
  return error.message === "HTTP 401";
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (typeof window !== "undefined" && is401(error as Error)) {
          window.location.replace("/");
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          !is401(error as Error) && failureCount < 1,
      },
    },
  });
}

// Server: one QueryClient per request — React's cache() is request-scoped,
// so this never leaks data between concurrent users.
export const getServerQueryClient = cache(makeQueryClient);
