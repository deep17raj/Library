import { useQuery } from "@tanstack/react-query";
import { api } from "../../app/api.js";

/** `{ summary, creditPaise, invoices, payments, refunds }` — my fees. */
export function useMyAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: async () => (await api.get("/account")).account,
  });
}

export function useMyReceipt(paymentId) {
  return useQuery({
    queryKey: ["receipt", paymentId],
    queryFn: async () => (await api.get(`/payments/${paymentId}/receipt`)).receipt,
  });
}
