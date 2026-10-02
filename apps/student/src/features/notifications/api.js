import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

const KEY = ["student", "notifications"];

export function useInbox(page = 1) {
  return useQuery({
    queryKey: [...KEY, page],
    queryFn: () => api.get(`/notifications?page=${page}`),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [...KEY, "unread"],
    queryFn: () => api.get("/notifications/unread"),
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
