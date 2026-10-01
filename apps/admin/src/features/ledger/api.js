import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../app/api.js";

export function useDayLedger(date) {
  return useQuery({
    queryKey: ["library", "ledger", date],
    queryFn: () => api.get(`/admin/ledger?date=${date}`),
    placeholderData: keepPreviousData,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ["library", "dashboard"],
    queryFn: () => api.get("/admin/dashboard"),
  });
}
