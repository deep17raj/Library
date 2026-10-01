import { planAllocation } from "@app/shared/billing";

/** @typedef {import("./billing.service.js").BillingDeps} Deps */

/**
 * Record that a payment paid these invoices: allocation rows + each invoice's paid
 * amount and status, in the caller's transaction (always together).
 * @param {Deps} deps
 * @param {{ invoiceId: string, amountPaise: number }[]} allocations
 */
export async function allocate(deps, tx, ctx, paymentId, allocations) {
  await deps.payments.insertAllocations(tx, ctx.tenantId, paymentId, allocations);
  for (const { invoiceId, amountPaise } of allocations) {
    await deps.invoices.addPaid(tx, ctx.tenantId, invoiceId, amountPaise);
  }
}

/**
 * Use a member's credit (money paid in advance) on their open invoices, oldest due
 * first. Runs after new invoices appear and after a payment is voided. The member
 * must already be locked by the caller.
 * @param {Deps} deps
 */
export async function applyCredit(deps, tx, ctx, memberId) {
  const credits = await deps.payments.listPaymentsWithCredit(tx, ctx.tenantId, memberId);
  if (credits.length === 0) return;
  let open = await deps.invoices.lockOpenInvoicesOfMember(tx, ctx.tenantId, memberId);
  for (const payment of credits) {
    const { allocations } = planAllocation(open, Number(payment.creditPaise));
    if (allocations.length === 0) break;
    await allocate(deps, tx, ctx, payment.id, allocations);
    const paid = new Map(allocations.map((a) => [a.invoiceId, a.amountPaise]));
    open = open.map((invoice) => ({
      ...invoice,
      paidPaise: invoice.paidPaise + (paid.get(invoice.id) ?? 0),
    }));
  }
}
