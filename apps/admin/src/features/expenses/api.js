import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

const EXPENSES_KEY = ["library", "expenses"];

/** @param {{ from: string, to: string }} range */
export function useExpenses(range) {
  return useQuery({
    queryKey: [...EXPENSES_KEY, range],
    queryFn: () => api.get(`/admin/expenses?from=${range.from}&to=${range.to}`),
    placeholderData: keepPreviousData,
  });
}

function useExpenseMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: EXPENSES_KEY }),
        queryClient.invalidateQueries({ queryKey: ["library", "ledger"] }),
      ]),
  });
}

export const useAddExpense = () =>
  useExpenseMutation((values) => api.post("/admin/expenses", values));
export const useVoidExpense = () =>
  useExpenseMutation(({ id, ...body }) => api.post(`/admin/expenses/${id}/void`, body));
