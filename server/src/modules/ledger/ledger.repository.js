import { queryAll, queryOne } from "../../db/transaction.js";

// Read-only SQL for the day ledger and the dashboard.

/** Valid payments received on a library-local day. */
export async function paymentsOnDay(db, tenantId, day) {
  return queryAll(
    db,
    `SELECT p.id, p.receipt_no AS receiptNo, p.amount_paise AS amountPaise, p.mode, m.name AS memberName
       FROM payments p JOIN members m ON m.id = p.member_id
      WHERE p.tenant_id = ? AND p.received_on = ? AND p.status = 'valid'
      ORDER BY p.received_at`,
    [tenantId, day],
  );
}

/** Part of that day's payments that went to security deposits (held, not earned). */
export async function depositsReceivedOnDay(db, tenantId, day) {
  const row = await queryOne(
    db,
    `SELECT COALESCE(SUM(a.amount_paise), 0) AS total
       FROM payment_allocations a
       JOIN payments p ON p.id = a.payment_id
       JOIN invoices i ON i.id = a.invoice_id
      WHERE a.tenant_id = ? AND p.received_on = ? AND p.status = 'valid' AND i.kind = 'deposit'`,
    [tenantId, day],
  );
  return Number(row.total);
}

export async function refundsOnDay(db, tenantId, day) {
  return queryAll(
    db,
    `SELECT r.amount_paise AS amountPaise, r.mode, m.name AS memberName
       FROM deposit_refunds r JOIN members m ON m.id = r.member_id
      WHERE r.tenant_id = ? AND r.refunded_on = ?`,
    [tenantId, day],
  );
}

export async function expensesOnDay(db, tenantId, day) {
  return queryAll(
    db,
    `SELECT title, category, amount_paise AS amountPaise, mode
       FROM expenses WHERE tenant_id = ? AND spent_on = ? AND status = 'valid'
      ORDER BY created_at`,
    [tenantId, day],
  );
}

/** Headline numbers for the dashboard. */
export async function libraryCounts(db, tenantId) {
  return queryOne(
    db,
    `SELECT
       (SELECT COUNT(*) FROM members WHERE tenant_id = ? AND status = 'active') AS activeMembers,
       (SELECT COUNT(*) FROM subscriptions WHERE tenant_id = ? AND status = 'active') AS activeBookings,
       (SELECT COUNT(*) FROM waitlist_entries WHERE tenant_id = ? AND status IN ('waiting','offered')) AS waiting,
       (SELECT COUNT(*) FROM seats WHERE tenant_id = ? AND status = 'active') AS seats`,
    [tenantId, tenantId, tenantId, tenantId],
  );
}

/** Active bookings per active slot (how full each slot is). */
export async function bookingsPerSlot(db, tenantId) {
  return queryAll(
    db,
    `SELECT sl.id, sl.name, sl.start_min AS startMin, sl.end_min AS endMin,
            COUNT(s.id) AS bookings
       FROM slots sl LEFT JOIN subscriptions s ON s.slot_id = sl.id AND s.status = 'active'
      WHERE sl.tenant_id = ? AND sl.status = 'active'
      GROUP BY sl.id, sl.name, sl.start_min, sl.end_min, sl.sort_order
      ORDER BY sl.sort_order, sl.start_min`,
    [tenantId],
  );
}

/** All members for the CSV export. */
export async function membersForExport(db, tenantId) {
  return queryAll(
    db,
    `SELECT member_code AS memberCode, name, phone, exam_target AS examTarget, joined_on AS joinedOn, status
       FROM members WHERE tenant_id = ? ORDER BY member_code`,
    [tenantId],
  );
}
