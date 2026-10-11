import { QueryClient } from "@tanstack/react-query";

/**
 * Singleton QueryClient instance shared across the entire application,
 * hooks, and services to enable deterministic cache invalidation and teardown.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
