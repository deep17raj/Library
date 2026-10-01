import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { invoiceBalance, summariseDues } from "@app/shared/billing";
import { AppError, notFound } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { byUser } from "../audit/audit.repository.js";
import { syncMemberInvoices } from "./invoicing.js";

/** @typedef {import("./billing.service.js").BillingDeps} Deps */

const invalid = (field, message) =>
  new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { [field]: message });

/** Lock the member and bring their invoices up to date. @param {Deps} deps */
export async function lockAndSyncMember(deps, tx, ctx, memberId) {
  const member = await deps.members.lockMember(tx, ctx.tenantId, memberId);
  if (!member) throw notFound("Member not found");
  await syncMemberInvoices(deps, tx, ctx, memberId);
  return member;
}

/**
 * A member's account: dues summary, invoices, payments, deposit refunds and credit.
 * @param {Deps} deps
 */
export async function getMemberAccount(deps, ctx, memberId) {
  await withTransaction(deps.db, (tx) => lockAndSyncMember(deps, tx, ctx, memberId));
  const [invoices, payments, refunds, credits, today] = await Promise.all([
    deps.invoices.listMemberInvoices(deps.db, ctx.tenantId, memberId),
    deps.payments.listMemberPayments(deps.db, ctx.tenantId, memberId),
    deps.payments.listRefundsOfMember(deps.db, ctx.tenantId, memberId),
    deps.payments.listPaymentsWithCredit(deps.db, ctx.tenantId, memberId),
    deps.calendar.today(deps.db, ctx.tenantId),
  ]);
  return {
    summary: summariseDues(invoices, today),
    creditPaise: credits.reduce((sum, payment) => sum + Number(payment.creditPaise), 0),
    invoices: invoices.map((invoice) => ({ ...invoice, balancePaise: invoiceBalance(invoice) })),
    payments,
    refunds,
  };
}

/** Any other charge ("Late fee", "Lost key"). @param {Deps} deps */
export async function addCharge(deps, ctx, { memberId, description, amountPaise, dueOn }) {
  await withTransaction(deps.db, async (tx) => {
    await lockAndSyncMember(deps, tx, ctx, memberId);
    const id = crypto.randomUUID();
    const due = dueOn ?? (await deps.calendar.today(tx, ctx.tenantId));
    await deps.invoices.insertInvoices(tx, ctx.tenantId, [
      {
        id,
        memberId,
        kind: "other",
        description,
        amountPaise,
        dueOn: due,
        createdBy: ctx.actor.id,
      },
    ]);
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "invoice.charge", "invoice", id, { amountPaise }),
    );
  });
  return getMemberAccount(deps, ctx, memberId);
}

async function lockInvoice(deps, tx, ctx, invoiceId) {
  const first = await deps.invoices.findInvoice(tx, ctx.tenantId, invoiceId);
  if (!first) throw notFound("Invoice not found");
  await deps.members.lockMember(tx, ctx.tenantId, first.memberId);
  const invoice = await deps.invoices.findInvoice(tx, ctx.tenantId, invoiceId, { forUpdate: true });
  if (invoice.status === "void") throw invalid("reason", "This charge is already void");
  return invoice;
}

/** Waive part or all of what is still owed. @param {Deps} deps */
export async function setDiscount(deps, ctx, invoiceId, { discountPaise, reason }) {
  const memberId = await withTransaction(deps.db, async (tx) => {
    const invoice = await lockInvoice(deps, tx, ctx, invoiceId);
    if (discountPaise > invoice.amountPaise - invoice.paidPaise) {
      throw invalid("discountPaise", "The discount can't be more than what is still unpaid");
    }
    await deps.invoices.setDiscount(tx, ctx.tenantId, invoiceId, discountPaise, reason);
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "invoice.discount", "invoice", invoiceId, { discountPaise, reason }),
    );
    return invoice.memberId;
  });
  return getMemberAccount(deps, ctx, memberId);
}

/** Cancel a charge made by mistake. Only unpaid charges: void the payment first. @param {Deps} deps */
export async function voidInvoice(deps, ctx, invoiceId, { reason }) {
  const memberId = await withTransaction(deps.db, async (tx) => {
    const invoice = await lockInvoice(deps, tx, ctx, invoiceId);
    if (invoice.paidPaise > 0) {
      throw invalid("reason", "Money was paid against this charge. Void that payment first.");
    }
    await deps.invoices.voidInvoice(tx, ctx.tenantId, invoiceId, reason);
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "invoice.void", "invoice", invoiceId, { reason }),
    );
    return invoice.memberId;
  });
  return getMemberAccount(deps, ctx, memberId);
}
