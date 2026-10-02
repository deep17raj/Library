import { useQuery } from "@tanstack/react-query";
import { api } from "../../app/api.js";

const KEY = ["library", "insights"];

export function useOccupancy() {
  return useQuery({
    queryKey: [...KEY, "occupancy"],
    queryFn: () => api.get("/admin/insights/occupancy"),
  });
}

export function useRevenue() {
  return useQuery({
    queryKey: [...KEY, "revenue"],
    queryFn: () => api.get("/admin/insights/revenue"),
  });
}

export function useDuesAgeing() {
  return useQuery({ queryKey: [...KEY, "dues"], queryFn: () => api.get("/admin/insights/dues") });
}

export function useChurn() {
  return useQuery({ queryKey: [...KEY, "churn"], queryFn: () => api.get("/admin/insights/churn") });
}

export function useAttendance(month) {
  return useQuery({
    queryKey: [...KEY, "attendance", month],
    queryFn: () => api.get(`/admin/insights/attendance?month=${month}`),
    enabled: Boolean(month),
  });
}
