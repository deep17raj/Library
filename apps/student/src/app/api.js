import { createApiClient } from "@app/shared/api";
import { LIBRARY_SLUG } from "./library.js";
import { ME_KEY, queryClient } from "./queryClient.js";

/**
 * The student app's API client: every call is about this library (/api/s/<slug>).
 * When the session is gone the cached student is cleared and the Shell shows sign-in.
 */
export const api = createApiClient({
  baseUrl: `/api/s/${LIBRARY_SLUG}`,
  onUnauthenticated: () => queryClient.setQueryData(ME_KEY, null),
});

/** For the few platform-wide calls (the push public key). */
export const platformApi = createApiClient({ baseUrl: "/api" });
