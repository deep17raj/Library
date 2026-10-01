import { bindDeps } from "../../lib/bindDeps.js";
import { libraryToday } from "../settings/librarySettings.js";
import * as ledgerRepository from "./ledger.repository.js";
import { exportDues, exportExpenses, exportMembers, exportPayments } from "./exports.js";

/**
 * @typedef {Object} LedgerDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof ledgerRepository} repo
 * @property {ReturnType<typeof import("../billing/billing.service.js").createBillingService>} billing
 * @property {ReturnType<typeof import("../expenses/expenses.service.js").createExpensesService>} expenses
 * @property {(db: any, tenantId: string) => Promise<string>} today
 */

/** Day ledger, dashboard numbers and CSV exports (read-only views over money). */
export function createLedgerService({
  db,
  billing,
  expenses,
  repo = ledgerRepository,
  today = libraryToday,
}) {
  return bindDeps(
    { db, repo, billing, expenses, today },
    { getDayLedger, getDashboard, exportPayments, exportExpenses, exportDues, exportMembers },
  );
}

const sumByMode = (rows) => {
  const byMode = {};
  for (const row of rows)
    byMode[row.mode ?? "other"] = (byMode[row.mode ?? "other"] ?? 0) + row.amountPaise;
  return byMode;
};
const total = (rows) => rows.reduce((sum, row) => sum + row.amountPaise, 0);

/**
 * One day's money: what came in (by mode), what went out (expenses, deposit refunds),
 * the net, and the cash that should be in the drawer.
 * @param {LedgerDeps} deps
 */
async function getDayLedger(deps, ctx, { date }) {
  const day = date ?? (await deps.today(deps.db, ctx.tenantId));
  const [payments, depositsIn, refunds, expenses] = await Promise.all([
    deps.repo.paymentsOnDay(deps.db, ctx.tenantId, day),
    deps.repo.depositsReceivedOnDay(deps.db, ctx.tenantId, day),
    deps.repo.refundsOnDay(deps.db, ctx.tenantId, day),
    deps.repo.expensesOnDay(deps.db, ctx.tenantId, day),
  ]);
  const collected = sumByMode(payments);
  const spent = sumByMode(expenses);
  const refunded = sumByMode(refunds);
  return {
    date: day,
    payments,
    expenses,
    refunds,
    collected: { byMode: collected, totalPaise: total(payments) },
    spent: { byMode: spent, totalPaise: total(expenses) },
    refunded: { byMode: refunded, totalPaise: total(refunds) },
    depositsInPaise: depositsIn,
    // Deposits are held for the student, not earned.
    earnedPaise: total(payments) - depositsIn,
    netPaise: total(payments) - total(expenses) - total(refunds),
    cashInHandPaise: (collected.cash ?? 0) - (spent.cash ?? 0) - (refunded.cash ?? 0),
  };
}

/** Today at a glance (UI-GUIDE §10 Dashboard). @param {LedgerDeps} deps */
async function getDashboard(deps, ctx) {
  const [dues, ledger, counts, slots] = await Promise.all([
    deps.billing.listDues(ctx),
    getDayLedger(deps, ctx, {}),
    deps.repo.libraryCounts(deps.db, ctx.tenantId),
    deps.repo.bookingsPerSlot(deps.db, ctx.tenantId),
  ]);
  return {
    today: ledger.date,
    collectedTodayPaise: ledger.collected.totalPaise,
    paymentsToday: ledger.payments.length,
    outstandingPaise: dues.totals.all,
    membersOwing: dues.members.length,
    longestOverdue: dues.members.slice(0, 5),
    activeMembers: Number(counts.activeMembers),
    activeBookings: Number(counts.activeBookings),
    waiting: Number(counts.waiting),
    seats: Number(counts.seats),
    slots: slots.map((slot) => ({ ...slot, bookings: Number(slot.bookings) })),
  };
}
