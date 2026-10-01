import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

export const LAYOUT_KEY = ["library", "layout"];

/** { categories, halls: [{ …, tables: [{ …, seats }] }] } */
export function useLayout() {
  return useQuery({
    queryKey: LAYOUT_KEY,
    queryFn: async () => (await api.get("/admin/layout")).layout,
  });
}

/**
 * Every layout change. Each takes one object and the API answers with the whole new
 * layout, which replaces the cached one — no refetch, no partial merges.
 */
const LAYOUT_ACTIONS = {
  createCategory: (body) => api.post("/admin/seat-categories", body),
  updateCategory: ({ id, ...body }) => api.patch(`/admin/seat-categories/${id}`, body),
  createHall: (body) => api.post("/admin/halls", body),
  updateHall: ({ id, ...body }) => api.patch(`/admin/halls/${id}`, body),
  deleteHall: ({ id }) => api.delete(`/admin/halls/${id}`),
  addTables: ({ hallId, ...body }) => api.post(`/admin/halls/${hallId}/tables`, body),
  updateTable: ({ id, ...body }) => api.patch(`/admin/tables/${id}`, body),
  deleteTable: ({ id }) => api.delete(`/admin/tables/${id}`),
  addSeats: ({ tableId, ...body }) => api.post(`/admin/tables/${tableId}/seats`, body),
  updateSeat: ({ id, ...body }) => api.patch(`/admin/seats/${id}`, body),
  deleteSeat: ({ id }) => api.delete(`/admin/seats/${id}`),
};

/** @param {keyof typeof LAYOUT_ACTIONS} action */
export function useLayoutAction(action) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: LAYOUT_ACTIONS[action],
    onSuccess: ({ layout }) => queryClient.setQueryData(LAYOUT_KEY, layout),
  });
}
