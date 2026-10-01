import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

// Seating data shared by the members screens and the seat map. Any seating change
// can affect members lists, member pages, the seat map, availability and the
// waitlist, so they are all refreshed together.
const SEATING_KEYS = [
  ["library", "members"],
  ["library", "member"],
  ["library", "seat-map"],
  ["library", "availability"],
  ["library", "seat-history"],
  ["library", "waitlist"],
];

export function useRefreshSeating() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(SEATING_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

/** Free seats for a slot + sit-anywhere halls' room. */
export function useAvailability(slotId) {
  return useQuery({
    queryKey: ["library", "availability", slotId],
    queryFn: async () => (await api.get(`/admin/availability?slotId=${slotId}`)).availability,
    enabled: Boolean(slotId),
    staleTime: 0,
  });
}

export function useSeatMap(hallId) {
  return useQuery({
    queryKey: ["library", "seat-map", hallId],
    queryFn: async () => (await api.get(`/admin/seat-map?hallId=${hallId}`)).seatMap,
    enabled: Boolean(hallId),
  });
}

export function useSeatHistory(seatId) {
  return useQuery({
    queryKey: ["library", "seat-history", seatId],
    queryFn: async () => (await api.get(`/admin/seats/${seatId}/history`)).history,
    enabled: Boolean(seatId),
  });
}

const BOOKING_ACTIONS = {
  addBooking: ({ memberId, ...body }) => api.post(`/admin/members/${memberId}/subscriptions`, body),
  move: ({ id, ...body }) => api.post(`/admin/subscriptions/${id}/move`, body),
  changeSlot: ({ id, ...body }) => api.post(`/admin/subscriptions/${id}/change-slot`, body),
  swap: (body) => api.post("/admin/subscriptions/swap", body),
  end: ({ id, ...body }) => api.post(`/admin/subscriptions/${id}/end`, body),
};

/** @param {keyof typeof BOOKING_ACTIONS} action */
export function useBookingAction(action) {
  const refresh = useRefreshSeating();
  return useMutation({ mutationFn: BOOKING_ACTIONS[action], onSuccess: refresh });
}
