import { useQuery } from "@tanstack/react-query";
import { ERROR_CODES } from "@app/shared/constants";
import { api } from "./api.js";
import { ME_KEY, queryClient } from "./queryClient.js";

const SIGNED_OUT_CODES = [ERROR_CODES.UNAUTHENTICATED, ERROR_CODES.ACCOUNT_DISABLED];

/**
 * The signed-in student's home data — `{ student, library, today, bookings, dues,
 * creditPaise, checkIns }` — or `null` when signed out. Every screen reads it from here.
 */
export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 60_000 });
}

export async function fetchMe() {
  try {
    return await api.get("/me");
  } catch (error) {
    if (SIGNED_OUT_CODES.includes(error.code)) return null;
    throw error;
  }
}

/** Load the student again now (after signing in or changing the password). */
export const reloadMe = () =>
  queryClient.fetchQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 0 });
