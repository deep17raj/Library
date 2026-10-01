import { QueryClient } from "@tanstack/react-query";

/** Cache key of the signed-in user (see session.js). */
export const SESSION_KEY = ["session"];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 4xx answers (validation, permissions) won't change on retry.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error?.status >= 400 && error?.status < 500),
    },
  },
});
