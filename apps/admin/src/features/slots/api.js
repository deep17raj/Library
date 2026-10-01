import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

export const SLOTS_KEY = ["library", "slots"];

/** [{ …slot, monthlyFeePaise, plans: [...] }] */
export function useSlots() {
  return useQuery({
    queryKey: SLOTS_KEY,
    queryFn: async () => (await api.get("/admin/slots")).slots,
  });
}

/** Every slot/plan change answers with all slots, which replace the cached list. */
const SLOT_ACTIONS = {
  createSlot: (body) => api.post("/admin/slots", body),
  updateSlot: ({ id, ...body }) => api.patch(`/admin/slots/${id}`, body),
  createPlan: ({ slotId, ...body }) => api.post(`/admin/slots/${slotId}/plans`, body),
  updatePlan: ({ id, ...body }) => api.patch(`/admin/plans/${id}`, body),
};

/** @param {keyof typeof SLOT_ACTIONS} action */
export function useSlotAction(action) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: SLOT_ACTIONS[action],
    onSuccess: ({ slots }) => queryClient.setQueryData(SLOTS_KEY, slots),
  });
}
