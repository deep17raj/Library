import { useMutation } from "@tanstack/react-query";
import { api } from "../../app/api.js";
import { ME_KEY, queryClient } from "../../app/queryClient.js";
import { reloadMe } from "../../app/session.js";

/** Sign in, then load the student's data before moving on (so no screen flashes). */
export function useLogin() {
  return useMutation({
    mutationFn: async (values) => {
      await api.post("/auth/login", values);
      return reloadMe();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (values) => {
      await api.post("/auth/password", values);
      return reloadMe();
    },
  });
}

/** Sign out and forget everything cached about this student on this phone. */
export function useLogout() {
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(ME_KEY, null);
    },
  });
}
