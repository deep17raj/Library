import { EXPENSE_CATEGORY_LABELS, PAYMENT_MODE_LABELS } from "@app/shared/constants";
import { toCsv } from "../../lib/csv.js";

// CSV exports for spreadsheets/accountants. Amounts are rupees with two decimals
// (what a spreadsheet expects), dates are library-local YYYY-MM-DD.

/** @typedef {import("./ledger.service.js").LedgerDeps} Deps */

const rupees = (paise) => Number((paise / 100).toFixed(2));

/** @param {Deps} deps */
export async function exportPayments(deps, ctx, range) {
  const { payments } = await deps.billing.listPayments(ctx, range);
  return toCsv(
    [
      "Receipt",
      "Date",
      "Member ID",
      "Member",
      "Amount (₹)",
      "Mode",
      "Reference",
      "Status",
      "Collected by",
    ],
    payments.map((p) => [
      p.receiptLabel,
      p.receivedOn,
      p.memberCode,
      p.memberName,
      rupees(p.amountPaise),
      PAYMENT_MODE_LABELS[p.mode] ?? p.mode,
      p.reference,
      p.status,
      p.collectedBy ?? "",
    ]),
  );
}

/** @param {Deps} deps */
export async function exportExpenses(deps, ctx, range) {
  const { expenses } = await deps.expenses.listExpenses(ctx, range);
  return toCsv(
    ["Date", "Category", "What for", "Amount (₹)", "Mode", "Status"],
    expenses.map((e) => [
      e.spentOn,
      EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
      e.title,
      rupees(e.amountPaise),
      PAYMENT_MODE_LABELS[e.mode] ?? e.mode,
      e.status,
    ]),
  );
}

/** @param {Deps} deps */
export async function exportDues(deps, ctx) {
  const { members } = await deps.billing.listDues(ctx);
  return toCsv(
    ["Member ID", "Member", "Phone", "Owes (₹)", "Overdue since", "Days overdue"],
    members.map((m) => [
      m.memberCode,
      m.name,
      m.phone,
      rupees(m.outstandingPaise),
      m.overdueSince,
      m.daysOverdue,
    ]),
  );
}

/** @param {Deps} deps */
export async function exportMembers(deps, ctx) {
  const members = await deps.repo.membersForExport(deps.db, ctx.tenantId);
  return toCsv(
    ["Member ID", "Name", "Phone", "Preparing for", "Joined", "Status"],
    members.map((m) => [m.memberCode, m.name, m.phone, m.examTarget, m.joinedOn, m.status]),
  );
}
