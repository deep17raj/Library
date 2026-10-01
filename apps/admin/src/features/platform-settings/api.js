import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

const SETTINGS_KEY = ["platform", "settings"];

export function usePlatformSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => (await api.get("/platform/settings")).settings,
  });
}

export function useSavePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values) => api.put("/platform/settings", values),
    onSuccess: ({ settings }) => queryClient.setQueryData(SETTINGS_KEY, settings),
  });
}
