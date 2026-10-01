import { daysBetween } from "./invoicePlan.js";

// A member's account in plain terms: what they owe now, what is coming, how late
// they are. The admin member page, the dues list and the student app all use these.

/**
 * @typedef {Object} InvoiceLike
 * @property {string} id
 * @property {string} dueOn
 * @property {number} amountPaise
 * @property {number} discountPaise
 * @property {number} paidPaise
 * @property {"open" | "paid" | "void"} status
 */

/** What is still owed on one invoice. */
export function invoiceBalance(invoice) {
  if (invoice.status === "void") return 0;
  return Math.max(0, invoice.amountPaise - invoice.discountPaise - invoice.paidPaise);
}

/**
 * @param {InvoiceLike[]} invoices
 * @param {string} today  library-local date
 */
export function summariseDues(invoices, today) {
  const open = invoices.filter((invoice) => invoiceBalance(invoice) > 0);
  const due = open.filter((invoice) => invoice.dueOn <= today);
  const upcoming = open
    .filter((invoice) => invoice.dueOn > today)
    .sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1));
  const overdueSince = due.map((invoice) => invoice.dueOn).sort()[0] ?? null;
  const nextDueOn = upcoming[0]?.dueOn ?? null;
  return {
    outstandingPaise: due.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0),
    upcomingPaise: upcoming.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0),
    overdueSince,
    daysOverdue: overdueSince && overdueSince < today ? daysBetween(overdueSince, today) : 0,
    nextDueOn,
    nextDueAmountPaise: upcoming
      .filter((invoice) => invoice.dueOn === nextDueOn)
      .reduce((sum, invoice) => sum + invoiceBalance(invoice), 0),
  };
}

/** Ageing bucket for the dues list. */
export function ageingBucket(daysOverdue) {
  if (daysOverdue <= 7) return "0-7";
  if (daysOverdue <= 30) return "8-30";
  return "30+";
}

/**
 * Among invoices due the same day, which are paid first: fees before extras, and the
 * refundable deposit last (so a short payment never lands in money to be returned).
 */
const KIND_ORDER = { admission: 0, seat_fee: 1, locker: 2, other: 3, deposit: 4 };

/**
 * Split a payment across open invoices: the ones the staff picked first (in that
 * order), then the oldest due first (same day: KIND_ORDER, then period). Whatever
 * is left is the member's credit.
 * @param {InvoiceLike[]} openInvoices
 * @param {number} amountPaise
 * @param {string[]} [preferredIds]
 */
export function planAllocation(openInvoices, amountPaise, preferredIds = []) {
  const rank = (invoice) => {
    const preferred = preferredIds.indexOf(invoice.id);
    return preferred === -1 ? preferredIds.length : preferred;
  };
  const compare = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  const ordered = [...openInvoices].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      compare(a.dueOn, b.dueOn) ||
      (KIND_ORDER[a.kind] ?? 3) - (KIND_ORDER[b.kind] ?? 3) ||
      compare(a.periodStart ?? "", b.periodStart ?? "") ||
      compare(a.id, b.id),
  );
  let left = amountPaise;
  const allocations = [];
  for (const invoice of ordered) {
    if (left <= 0) break;
    const take = Math.min(left, invoiceBalance(invoice));
    if (take > 0) {
      allocations.push({ invoiceId: invoice.id, amountPaise: take });
      left -= take;
    }
  }
  return { allocations, leftoverPaise: left };
}
