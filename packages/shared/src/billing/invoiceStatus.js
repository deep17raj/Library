/**
 * How an invoice reads on screen (fixed tones, UI-GUIDE §6).
 * @param {{ status: string, balancePaise: number, paidPaise: number, dueOn: string }} invoice
 * @param {string} today library-local date
 * @returns {{ label: string, tone: "green" | "amber" | "red" | "slate" }}
 */
export function invoiceStatus(invoice, today) {
  if (invoice.status === "void") return { label: "Void", tone: "slate" };
  if (invoice.balancePaise === 0) return { label: "Paid", tone: "green" };
  if (invoice.dueOn > today) return { label: "Upcoming", tone: "amber" };
  if (invoice.paidPaise > 0) return { label: "Part paid", tone: "amber" };
  return { label: invoice.dueOn < today ? "Overdue" : "Due today", tone: "red" };
}
