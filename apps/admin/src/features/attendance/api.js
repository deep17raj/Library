import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

/** The desk screen's daily code, QR target and present count. Refetched every minute. */
export function useCheckinDesk() {
  return useQuery({
    queryKey: ["library", "checkin-desk"],
    queryFn: () => api.get("/admin/checkin/desk"),
    refetchInterval: 60_000,
  });
}

/** Who is present on a day (optionally one slot). */
export function useAttendance({ date, slotId }) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (slotId) params.set("slotId", slotId);
  return useQuery({
    queryKey: ["library", "attendance", date ?? "", slotId ?? ""],
    queryFn: () => api.get(`/admin/attendance?${params}`),
    placeholderData: keepPreviousData,
  });
}

/** A member's attendance for a month (member page). */
export function useMemberAttendance(memberId, month) {
  return useQuery({
    queryKey: ["library", "member-attendance", memberId, month ?? ""],
    queryFn: () =>
      api.get(`/admin/members/${memberId}/attendance${month ? `?month=${month}` : ""}`),
    enabled: Boolean(memberId),
  });
}

function useAttendanceMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all(
        [
          ["library", "attendance"],
          ["library", "checkin-desk"],
          ["library", "member-attendance"],
          ["library", "dashboard"],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
}

/** Kiosk: phone + the day's code. Public per-library route (resolved by slug). */
export function useKioskCheckin(slug) {
  return useAttendanceMutation((body) => api.post(`/s/${slug}/kiosk/checkin`, body));
}

/** Staff marks a member present (overrides the slot/dues gates). */
export function useMarkAttendance() {
  return useAttendanceMutation((body) => api.post("/admin/attendance", body));
}
