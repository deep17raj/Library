import { QueryClient } from "@tanstack/react-query";

/** Cache key of the signed-in student's home data (see session.js). */
export const ME_KEY = ["me"];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // A student opening the app again later should see fresh fees/attendance.
      refetchOnWindowFocus: true,
      // 4xx answers (validation, permissions) won't change on retry.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error?.status >= 400 && error?.status < 500),
    },
  },
});
