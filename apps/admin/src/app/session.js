import { useQuery } from "@tanstack/react-query";
import { ERROR_CODES } from "@app/shared/constants";
import { api } from "./api.js";
import { SESSION_KEY } from "./queryClient.js";

const SIGNED_OUT_CODES = [
  ERROR_CODES.UNAUTHENTICATED,
  ERROR_CODES.LIBRARY_SUSPENDED,
  ERROR_CODES.ACCOUNT_DISABLED,
];

/**
 * The signed-in user (`null` when signed out). Every screen reads the user from
 * here; nothing else stores it.
 */
export function useSession() {
  return useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession, staleTime: 5 * 60_000 });
}

async function fetchSession() {
  try {
    const { user } = await api.get("/auth/me");
    return user;
  } catch (error) {
    if (SIGNED_OUT_CODES.includes(error.code)) return null;
    throw error;
  }
}
