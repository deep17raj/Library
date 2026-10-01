import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

// Money hooks. Any money change can move dues, the dashboard, the ledger, a member's
// account and lists — so they are all refreshed together.
const MONEY_KEYS = [
  ["library", "account"],
  ["library", "dues"],
  ["library", "payments"],
  ["library", "ledger"],
  ["library", "dashboard"],
  ["library", "members"],
];

function useMoneyMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all(MONEY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

/** { summary, creditPaise, invoices, payments, refunds } */
export function useAccount(memberId) {
  return useQuery({
    queryKey: ["library", "account", memberId],
    queryFn: async () => (await api.get(`/admin/members/${memberId}/account`)).account,
    enabled: Boolean(memberId),
  });
}

export function useDues() {
  return useQuery({ queryKey: ["library", "dues"], queryFn: () => api.get("/admin/dues") });
}

/** @param {{ from: string, to: string, mode?: string }} filters */
export function usePayments(filters) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
  return useQuery({
    queryKey: ["library", "payments", filters],
    queryFn: () => api.get(`/admin/payments?${params}`),
    placeholderData: keepPreviousData,
  });
}

export function useReceipt(id) {
  return useQuery({
    queryKey: ["library", "payments", "receipt", id],
    queryFn: async () => (await api.get(`/admin/payments/${id}`)).receipt,
  });
}

export const useCollectPayment = () =>
  useMoneyMutation((values) => api.post("/admin/payments", values));
export const useVoidPayment = () =>
  useMoneyMutation(({ id, ...body }) => api.post(`/admin/payments/${id}/void`, body));
export const useAddCharge = () => useMoneyMutation((values) => api.post("/admin/invoices", values));
export const useDiscount = () =>
  useMoneyMutation(({ id, ...body }) => api.patch(`/admin/invoices/${id}/discount`, body));
export const useVoidInvoice = () =>
  useMoneyMutation(({ id, ...body }) => api.post(`/admin/invoices/${id}/void`, body));
export const useRefundDeposit = () =>
  useMoneyMutation(({ id, ...body }) => api.post(`/admin/invoices/${id}/refund`, body));
