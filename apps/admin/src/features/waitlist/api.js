import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

const WAITLIST_KEY = ["library", "waitlist"];

/** @param {{ slotId?: string, view: "open" | "all" }} filters */
export function useWaitlist({ slotId, view }) {
  const params = new URLSearchParams({ view, ...(slotId ? { slotId } : {}) });
  return useQuery({
    queryKey: [...WAITLIST_KEY, slotId, view],
    queryFn: async () => (await api.get(`/admin/waitlist?${params}`)).entries,
  });
}

function useWaitlistMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WAITLIST_KEY }),
  });
}

export const useAddToWaitlist = () =>
  useWaitlistMutation((values) => api.post("/admin/waitlist", values));

export const useUpdateWaitlistEntry = () =>
  useWaitlistMutation(({ id, ...values }) => api.patch(`/admin/waitlist/${id}`, values));
