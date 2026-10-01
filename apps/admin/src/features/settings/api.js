import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ROLES } from "@app/shared/constants";
import { api } from "../../app/api.js";
import { useSession } from "../../app/session.js";

const SETTINGS_KEY = ["library", "settings"];

/**
 * The signed-in library's settings (name, timezone, brand…). Disabled for the super
 * admin, who is not inside a library.
 */
export function useLibrarySettings() {
  const { data: user } = useSession();
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => (await api.get("/admin/settings")).settings,
    enabled: Boolean(user) && user.role !== ROLES.SUPER_ADMIN,
    staleTime: 5 * 60_000,
  });
}

function useSettingsMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: ({ settings }) => queryClient.setQueryData(SETTINGS_KEY, settings),
  });
}

export const useSaveSettings = () =>
  useSettingsMutation((values) => api.put("/admin/settings", values));

export const useUploadLogo = () =>
  useSettingsMutation((file) => {
    const form = new FormData();
    form.append("logo", file);
    return api.post("/admin/settings/logo", form);
  });

export const useRemoveLogo = () => useSettingsMutation(() => api.delete("/admin/settings/logo"));

export const useSaveBillingRules = () =>
  useSettingsMutation((values) => api.put("/admin/settings/billing", values));
