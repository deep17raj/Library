import { execute, queryAll, queryOne } from "../../db/transaction.js";

// SQL for payments, payment_allocations and deposit_refunds.

const toPayment = (row) =>
  row && {
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    memberCode: row.member_code,
    receiptNo: row.receipt_no,
    amountPaise: row.amount_paise,
    mode: row.mode,
    reference: row.reference,
    note: row.note,
    receivedAt: row.received_at,
    receivedOn: row.received_on,
    collectedBy: row.collected_by_name ?? null,
    status: row.status,
    voidReason: row.void_reason,
    voidedAt: row.voided_at,
  };

const SELECT_PAYMENT = `SELECT p.*, m.name AS member_name, m.member_code, u.name AS collected_by_name
  FROM payments p JOIN members m ON m.id = p.member_id LEFT JOIN users u ON u.id = p.collected_by`;

export async function insertPayment(db, tenantId, p) {
  await execute(
    db,
    `INSERT INTO payments (id, tenant_id, member_id, receipt_no, amount_paise, mode, reference, note,
       received_at, received_on, collected_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?)`,
    [
      p.id,
      tenantId,
      p.memberId,
      p.receiptNo,
      p.amountPaise,
      p.mode,
      p.reference,
      p.note,
      p.receivedOn,
      p.collectedBy,
    ],
  );
}

export async function findPayment(db, tenantId, id, { forUpdate = false } = {}) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  return toPayment(
    await queryOne(db, `${SELECT_PAYMENT} WHERE p.tenant_id = ? AND p.id = ?${lock}`, [
      tenantId,
      id,
    ]),
  );
}

/** Payments in a date range (library-local days), newest first. */
export async function listPayments(db, tenantId, { from, to, mode }) {
  const rows = await queryAll(
    db,
    `${SELECT_PAYMENT} WHERE p.tenant_id = ? AND p.received_on BETWEEN ? AND ? AND (? IS NULL OR p.mode = ?)
      ORDER BY p.received_at DESC, p.receipt_no DESC`,
    [tenantId, from, to, mode ?? null, mode ?? null],
  );
  return rows.map(toPayment);
}

export async function listMemberPayments(db, tenantId, memberId) {
  const rows = await queryAll(
    db,
    `${SELECT_PAYMENT} WHERE p.tenant_id = ? AND p.member_id = ? ORDER BY p.received_at DESC`,
    [tenantId, memberId],
  );
  return rows.map(toPayment);
}

export async function markPaymentVoid(db, tenantId, id, { reason, voidedBy }) {
  await execute(
    db,
    `UPDATE payments SET status = 'void', void_reason = ?, voided_by = ?, voided_at = UTC_TIMESTAMP()
      WHERE tenant_id = ? AND id = ?`,
    [reason, voidedBy, tenantId, id],
  );
}

// ── Allocations ────────────────────────────────────────────────────────
export async function insertAllocations(db, tenantId, paymentId, allocations) {
  if (allocations.length === 0) return;
  const rows = allocations.map((a) => [paymentId, a.invoiceId, tenantId, a.amountPaise]);
  // A payment may top up an invoice it already paid part of (credit applied later).
  await execute(
    db,
    `INSERT INTO payment_allocations (payment_id, invoice_id, tenant_id, amount_paise) VALUES ?
     ON DUPLICATE KEY UPDATE amount_paise = amount_paise + VALUES(amount_paise)`,
    [rows],
  );
}

/** What a payment paid for, with the invoices' descriptions. */
export async function listAllocationsOfPayment(db, tenantId, paymentId) {
  return queryAll(
    db,
    `SELECT a.invoice_id AS invoiceId, a.amount_paise AS amountPaise, i.description, i.kind
       FROM payment_allocations a JOIN invoices i ON i.id = a.invoice_id
      WHERE a.tenant_id = ? AND a.payment_id = ? ORDER BY i.due_on`,
    [tenantId, paymentId],
  );
}

export async function deleteAllocationsOfPayment(db, tenantId, paymentId) {
  await execute(db, "DELETE FROM payment_allocations WHERE tenant_id = ? AND payment_id = ?", [
    tenantId,
    paymentId,
  ]);
}

/** A member's valid payments that still have unallocated money (their credit), oldest first. */
export async function listPaymentsWithCredit(db, tenantId, memberId) {
  return queryAll(
    db,
    `SELECT p.id, p.amount_paise - COALESCE(SUM(a.amount_paise), 0) AS creditPaise
       FROM payments p LEFT JOIN payment_allocations a ON a.payment_id = p.id
      WHERE p.tenant_id = ? AND p.member_id = ? AND p.status = 'valid'
      GROUP BY p.id, p.amount_paise, p.received_at
     HAVING creditPaise > 0
      ORDER BY p.received_at`,
    [tenantId, memberId],
  );
}

// ── Deposit refunds ────────────────────────────────────────────────────
export async function insertRefund(db, tenantId, r) {
  await execute(
    db,
    `INSERT INTO deposit_refunds (id, tenant_id, member_id, invoice_id, amount_paise, mode, refunded_on, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.id,
      tenantId,
      r.memberId,
      r.invoiceId,
      r.amountPaise,
      r.mode,
      r.refundedOn,
      r.note,
      r.createdBy,
    ],
  );
}

export async function sumRefundsOfInvoice(db, tenantId, invoiceId) {
  const row = await queryOne(
    db,
    "SELECT COALESCE(SUM(amount_paise), 0) AS total FROM deposit_refunds WHERE tenant_id = ? AND invoice_id = ?",
    [tenantId, invoiceId],
  );
  return Number(row.total);
}

export async function listRefundsOfMember(db, tenantId, memberId) {
  return queryAll(
    db,
    `SELECT id, invoice_id AS invoiceId, amount_paise AS amountPaise, mode, refunded_on AS refundedOn, note
       FROM deposit_refunds WHERE tenant_id = ? AND member_id = ? ORDER BY refunded_on DESC`,
    [tenantId, memberId],
  );
}
