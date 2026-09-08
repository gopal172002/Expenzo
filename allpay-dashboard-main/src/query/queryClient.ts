import { QueryClient } from "@tanstack/react-query";

/** Shared client: show cached admin lists instantly; soft-refetch after 60s. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
