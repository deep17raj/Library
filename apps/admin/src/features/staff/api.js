import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

const STAFF_KEY = ["library", "staff"];

export function useStaff() {
  return useQuery({
    queryKey: STAFF_KEY,
    queryFn: async () => (await api.get("/admin/staff")).staff,
  });
}

function useStaffMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STAFF_KEY }),
  });
}

export const useCreateStaff = () => useStaffMutation((values) => api.post("/admin/staff", values));

export const useUpdateStaff = (id) =>
  useStaffMutation((values) => api.patch(`/admin/staff/${id}`, values));

export const useResetStaffPassword = (id) =>
  useStaffMutation((values) => api.post(`/admin/staff/${id}/password`, values));
