import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

const KEY = ["library", "notifications"];

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: [...KEY, page],
    queryFn: () => api.get(`/admin/notifications?page=${page}`),
  });
}

export function useAudiencePreview(audience) {
  const params = new URLSearchParams({ type: audience.type });
  if (audience.slotId) params.set("slotId", audience.slotId);
  return useQuery({
    queryKey: [...KEY, "preview", audience],
    queryFn: () => api.get(`/admin/notifications/preview?${params}`),
    enabled: Boolean(audience.type),
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values) => api.post("/admin/notifications", values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
