import { createApiClient } from "@app/shared/api";
import { queryClient, SESSION_KEY } from "./queryClient.js";

/**
 * The admin app's one API client. When any call reports the session is gone, the
 * cached session is cleared and the Shell sends the person to the login page.
 */
export const api = createApiClient({
  baseUrl: "/api",
  onUnauthenticated: () => queryClient.setQueryData(SESSION_KEY, null),
});
