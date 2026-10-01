import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { planAllocation } from "@app/shared/billing";
import { AppError, notFound } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { takeNextNumber } from "../../db/counters.js";
import { publicFileUrl } from "../../lib/images.js";
import { byUser } from "../audit/audit.repository.js";
import { lockAndSyncMember } from "./account.js";
import { allocate, applyCredit } from "./allocation.js";

/** @typedef {import("./billing.service.js").BillingDeps} Deps */

const invalid = (field, message) =>
  new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { [field]: message });

/** "R" + 123 → "R-000123" (what is printed and searched for). */
export function receiptLabel(prefix, receiptNo) {
  return `${prefix ? `${prefix}-` : ""}${String(receiptNo).padStart(6, "0")}`;
}

/**
 * Take a payment: a receipt number, then the money goes to the invoices picked (if
 * any) and the oldest dues; anything more becomes credit for the next invoices.
 * @param {Deps} deps
 */
export async function collectPayment(deps, ctx, input) {
  const id = crypto.randomUUID();
  await withTransaction(deps.db, async (tx) => {
    await lockAndSyncMember(deps, tx, ctx, input.memberId);
    const open = await deps.invoices.lockOpenInvoicesOfMember(tx, ctx.tenantId, input.memberId);
    const unknown = input.invoiceIds.filter(
      (invoiceId) => !open.some((invoice) => invoice.id === invoiceId),
    );
    if (unknown.length > 0)
      throw invalid("invoiceIds", "Some chosen dues are already paid or not this member's");
    const receiptNo = await takeNextNumber(tx, ctx.tenantId, "receipt", 1);
    const receivedOn = input.receivedOn ?? (await deps.calendar.today(tx, ctx.tenantId));
    await deps.payments.insertPayment(tx, ctx.tenantId, {
      ...input,
      id,
      receiptNo,
      receivedOn,
      collectedBy: ctx.actor.id,
    });
    const { allocations } = planAllocation(open, input.amountPaise, input.invoiceIds);
    await allocate(deps, tx, ctx, id, allocations);
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "payment.collect", "payment", id, {
        amountPaise: input.amountPaise,
        receiptNo,
      }),
    );
  });
  return getReceipt(deps, ctx, id);
}

/**
 * What a receipt shows: the payment, what it paid for, any credit left from it, the
 * member's balance now, and the library's details for the header.
 * @param {Deps} deps
 */
export async function getReceipt(deps, ctx, id) {
  const payment = await deps.payments.findPayment(deps.db, ctx.tenantId, id);
  if (!payment) throw notFound("Payment not found");
  const [allocations, settings, billing] = await Promise.all([
    deps.payments.listAllocationsOfPayment(deps.db, ctx.tenantId, id),
    deps.settings.getSettings(deps.db, ctx.tenantId),
    deps.calendar.billing(deps.db, ctx.tenantId),
  ]);
  const allocated = allocations.reduce((sum, a) => sum + a.amountPaise, 0);
  return {
    payment: { ...payment, receiptLabel: receiptLabel(billing.receiptPrefix, payment.receiptNo) },
    allocations,
    creditPaise: payment.status === "valid" ? payment.amountPaise - allocated : 0,
    library: {
      name: settings.displayName,
      address: settings.address,
      phone: settings.contactPhone,
      logoUrl: publicFileUrl(settings.logoPath),
    },
  };
}

/** @param {Deps} deps */
export async function listPayments(deps, ctx, query) {
  const [payments, billing] = await Promise.all([
    deps.payments.listPayments(deps.db, ctx.tenantId, query),
    deps.calendar.billing(deps.db, ctx.tenantId),
  ]);
  const valid = payments.filter((p) => p.status === "valid");
  const byMode = {};
  for (const p of valid) byMode[p.mode] = (byMode[p.mode] ?? 0) + p.amountPaise;
  return {
    payments: payments.map((p) => ({
      ...p,
      receiptLabel: receiptLabel(billing.receiptPrefix, p.receiptNo),
    })),
    totalPaise: valid.reduce((sum, p) => sum + p.amountPaise, 0),
    byMode,
  };
}

/**
 * Void a payment (wrong amount, bounced cheque). The row stays, marked void; the
 * invoices it paid are owed again; other credit is re-applied.
 * @param {Deps} deps
 */
export async function voidPayment(deps, ctx, id, { reason }) {
  await withTransaction(deps.db, async (tx) => {
    const first = await deps.payments.findPayment(tx, ctx.tenantId, id);
    if (!first) throw notFound("Payment not found");
    await deps.members.lockMember(tx, ctx.tenantId, first.memberId);
    const payment = await deps.payments.findPayment(tx, ctx.tenantId, id, { forUpdate: true });
    if (payment.status === "void") throw invalid("reason", "This receipt is already void");
    const allocations = await deps.payments.listAllocationsOfPayment(tx, ctx.tenantId, id);
    await assertDepositsNotRefunded(deps, tx, ctx, allocations);
    for (const { invoiceId, amountPaise } of allocations)
      await deps.invoices.addPaid(tx, ctx.tenantId, invoiceId, -amountPaise);
    await deps.payments.deleteAllocationsOfPayment(tx, ctx.tenantId, id);
    await deps.payments.markPaymentVoid(tx, ctx.tenantId, id, { reason, voidedBy: ctx.actor.id });
    await applyCredit(deps, tx, ctx, payment.memberId);
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "payment.void", "payment", id, { reason, allocations }),
    );
  });
  return getReceipt(deps, ctx, id);
}

/** Money already handed back can't be "un-received". */
async function assertDepositsNotRefunded(deps, tx, ctx, allocations) {
  for (const allocation of allocations.filter((a) => a.kind === "deposit")) {
    if ((await deps.payments.sumRefundsOfInvoice(tx, ctx.tenantId, allocation.invoiceId)) > 0) {
      throw invalid(
        "reason",
        "Part of this payment was a deposit that has been refunded; it can't be voided",
      );
    }
  }
}

/** Give back (part of) a paid security deposit. @param {Deps} deps */
export async function refundDeposit(deps, ctx, invoiceId, input) {
  const first = await deps.invoices.findInvoice(deps.db, ctx.tenantId, invoiceId);
  if (!first || first.kind !== "deposit") throw notFound("Deposit not found");
  await withTransaction(deps.db, async (tx) => {
    await deps.members.lockMember(tx, ctx.tenantId, first.memberId);
    const invoice = await deps.invoices.findInvoice(tx, ctx.tenantId, invoiceId, {
      forUpdate: true,
    });
    const refundable =
      invoice.paidPaise - (await deps.payments.sumRefundsOfInvoice(tx, ctx.tenantId, invoiceId));
    if (input.amountPaise > refundable) {
      throw invalid(
        "amountPaise",
        `At most ${refundable / 100} rupees of this deposit can be refunded`,
      );
    }
    const id = crypto.randomUUID();
    const refundedOn = input.refundedOn ?? (await deps.calendar.today(tx, ctx.tenantId));
    await deps.payments.insertRefund(tx, ctx.tenantId, {
      ...input,
      id,
      invoiceId,
      memberId: invoice.memberId,
      refundedOn,
      createdBy: ctx.actor.id,
    });
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "deposit.refund", "invoice", invoiceId, { amountPaise: input.amountPaise }),
    );
  });
  return first.memberId;
}
