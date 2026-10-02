import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../app/api.js";

/** `{ month, today, streak, presentDays, visits }` for the month containing `monthStart`. */
export function useMyAttendance(monthStart) {
  return useQuery({
    queryKey: ["attendance", monthStart],
    queryFn: () => api.get(`/attendance?month=${monthStart}`),
    placeholderData: keepPreviousData,
  });
}
