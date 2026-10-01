import { execute, queryAll, queryOne } from "../../db/transaction.js";

// SQL for `invoices`: what each member owes. paid_paise and status are only changed
// through addPaid / setDiscount / voidInvoice so they always agree with allocations.

const toInvoice = (row) =>
  row && {
    id: row.id,
    memberId: row.member_id,
    subscriptionId: row.subscription_id,
    kind: row.kind,
    description: row.description,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    dueOn: row.due_on,
    amountPaise: row.amount_paise,
    discountPaise: row.discount_paise,
    discountReason: row.discount_reason,
    paidPaise: row.paid_paise,
    status: row.status,
    voidReason: row.void_reason,
    createdAt: row.created_at,
  };

/** Paid once payments + discount cover the amount; void stays void. */
const STATUS_AFTER_CHANGE = `status = IF(status = 'void', 'void',
  IF(paid_paise + discount_paise >= amount_paise, 'paid', 'open'))`;

export async function listMemberInvoices(db, tenantId, memberId) {
  const rows = await queryAll(
    db,
    "SELECT * FROM invoices WHERE tenant_id = ? AND member_id = ? ORDER BY due_on DESC, created_at DESC",
    [tenantId, memberId],
  );
  return rows.map(toInvoice);
}

/** Open invoices of a member, locked: a payment is about to change them. */
export async function lockOpenInvoicesOfMember(db, tenantId, memberId) {
  const rows = await queryAll(
    db,
    `SELECT * FROM invoices WHERE tenant_id = ? AND member_id = ? AND status = 'open'
      ORDER BY due_on, created_at FOR UPDATE`,
    [tenantId, memberId],
  );
  return rows.map(toInvoice);
}

export async function findInvoice(db, tenantId, id, { forUpdate = false } = {}) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  return toInvoice(
    await queryOne(db, `SELECT * FROM invoices WHERE tenant_id = ? AND id = ?${lock}`, [
      tenantId,
      id,
    ]),
  );
}

/** Which of these dedupe keys already have an invoice. */
export async function existingDedupeKeys(db, tenantId, keys) {
  if (keys.length === 0) return new Set();
  const rows = await queryAll(
    db,
    "SELECT dedupe_key FROM invoices WHERE tenant_id = ? AND dedupe_key IN (?)",
    [tenantId, keys],
  );
  return new Set(rows.map((row) => row.dedupe_key));
}

/**
 * Insert invoices; one that already exists (same dedupe key, e.g. created by a
 * parallel request) is skipped rather than failing.
 */
export async function insertInvoices(db, tenantId, invoices) {
  if (invoices.length === 0) return;
  const rows = invoices.map((i) => [
    i.id,
    tenantId,
    i.memberId,
    i.subscriptionId ?? null,
    i.kind,
    i.description,
    i.periodStart ?? null,
    i.periodEnd ?? null,
    i.dueOn,
    i.amountPaise,
    i.dedupeKey ?? null,
    i.createdBy ?? null,
  ]);
  await execute(
    db,
    `INSERT INTO invoices (id, tenant_id, member_id, subscription_id, kind, description, period_start,
       period_end, due_on, amount_paise, dedupe_key, created_by)
     VALUES ? ON DUPLICATE KEY UPDATE id = id`,
    [rows],
  );
}

/** Add (or with a negative delta, remove) paid money and refresh the status. */
export async function addPaid(db, tenantId, id, deltaPaise) {
  await execute(
    db,
    `UPDATE invoices SET paid_paise = paid_paise + ?, ${STATUS_AFTER_CHANGE} WHERE tenant_id = ? AND id = ?`,
    [deltaPaise, tenantId, id],
  );
}

export async function setDiscount(db, tenantId, id, discountPaise, reason) {
  await execute(
    db,
    `UPDATE invoices SET discount_paise = ?, discount_reason = ?, ${STATUS_AFTER_CHANGE}
      WHERE tenant_id = ? AND id = ?`,
    [discountPaise, reason, tenantId, id],
  );
}

export async function voidInvoice(db, tenantId, id, reason) {
  await execute(
    db,
    "UPDATE invoices SET status = 'void', void_reason = ? WHERE tenant_id = ? AND id = ?",
    [reason, tenantId, id],
  );
}

/** Members who owe money now (due today or earlier), oldest debt first. */
export async function listMembersWithDues(db, tenantId, today) {
  return queryAll(
    db,
    `SELECT m.id AS memberId, m.name, m.member_code AS memberCode, m.phone,
            SUM(i.amount_paise - i.discount_paise - i.paid_paise) AS outstandingPaise,
            MIN(i.due_on) AS overdueSince
       FROM invoices i JOIN members m ON m.id = i.member_id
      WHERE i.tenant_id = ? AND i.status = 'open' AND i.due_on <= ?
      GROUP BY m.id, m.name, m.member_code, m.phone
     HAVING outstandingPaise > 0
      ORDER BY overdueSince, m.name`,
    [tenantId, today],
  );
}

/** How much one member owes that is already due on or before `today` (the check-in gate). */
export async function overduePaiseOfMember(db, tenantId, memberId, today) {
  const row = await queryOne(
    db,
    `SELECT COALESCE(SUM(amount_paise - discount_paise - paid_paise), 0) AS overduePaise
       FROM invoices
      WHERE tenant_id = ? AND member_id = ? AND status = 'open' AND due_on <= ?`,
    [tenantId, memberId, today],
  );
  return Number(row?.overduePaise ?? 0);
}

/**
 * Every subscription with its billing terms (active ones, and ended ones — they may
 * still owe the period they used). Optionally for one member.
 */
export async function listBillableSubscriptions(db, tenantId, memberId = null) {
  return queryAll(
    db,
    `SELECT s.id, s.member_id AS memberId, sl.name AS slotName, s.price_paise AS pricePaise,
            s.locker_fee_paise AS lockerFeePaise, s.period_unit AS periodUnit,
            s.period_count AS periodCount, s.collection, s.bills_from AS billsFrom,
            IF(s.status = 'active', NULL, s.end_on) AS endOn
       FROM subscriptions s JOIN slots sl ON sl.id = s.slot_id
      WHERE s.tenant_id = ? AND (? IS NULL OR s.member_id = ?)`,
    [tenantId, memberId, memberId],
  );
}
