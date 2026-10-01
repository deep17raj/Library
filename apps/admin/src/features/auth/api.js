import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";
import { SESSION_KEY } from "../../app/queryClient.js";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials) => api.post("/auth/login", credentials),
    onSuccess: ({ user }) => queryClient.setQueryData(SESSION_KEY, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    // Drop every cached screen so the next person on this device sees nothing old.
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(SESSION_KEY, null);
    },
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: (passwords) => api.post("/auth/password", passwords) });
}
