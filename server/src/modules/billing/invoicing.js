import crypto from "node:crypto";
import { plannedInvoices } from "@app/shared/billing";
import { withTransaction } from "../../db/transaction.js";
import { applyCredit } from "./allocation.js";

/** @typedef {import("./billing.service.js").BillingDeps} Deps */

/**
 * Invoices are generated, not derived (docs/ARCHITECTURE.md §8.1): every billing
 * period that has started gets one seat-fee invoice (and a locker invoice), created
 * once thanks to its dedupe key. This runs when a member's money is looked at, when a
 * payment is collected, and hourly from the job scheduler.
 */

/** Missing invoices of some subscriptions, ready to insert. */
async function missingInvoices(deps, db, ctx, subscriptions, today) {
  const settings = await deps.calendar.billing(db, ctx.tenantId);
  const planned = subscriptions.flatMap((sub) =>
    plannedInvoices(sub, settings, today).map((invoice) => ({
      ...invoice,
      memberId: sub.memberId,
    })),
  );
  const existing = await deps.invoices.existingDedupeKeys(
    db,
    ctx.tenantId,
    planned.map((i) => i.dedupeKey),
  );
  return planned
    .filter((invoice) => !existing.has(invoice.dedupeKey))
    .map((i) => ({ ...i, id: crypto.randomUUID() }));
}

/**
 * Bring one member's invoices up to date, inside the caller's transaction (the member
 * is locked by the caller), then use any credit they have.
 * @param {Deps} deps
 */
export async function syncMemberInvoices(deps, tx, ctx, memberId) {
  const today = await deps.calendar.today(tx, ctx.tenantId);
  const subscriptions = await deps.invoices.listBillableSubscriptions(tx, ctx.tenantId, memberId);
  const missing = await missingInvoices(deps, tx, ctx, subscriptions, today);
  await deps.invoices.insertInvoices(tx, ctx.tenantId, missing);
  if (missing.length > 0) await applyCredit(deps, tx, ctx, memberId);
}

/**
 * Bring a whole library up to date (dues list, dashboard, hourly job). Members with
 * something missing are synced one by one, each under its own member lock.
 * @param {Deps} deps
 */
export async function syncLibraryInvoices(deps, ctx) {
  const today = await deps.calendar.today(deps.db, ctx.tenantId);
  const subscriptions = await deps.invoices.listBillableSubscriptions(deps.db, ctx.tenantId);
  const missing = await missingInvoices(deps, deps.db, ctx, subscriptions, today);
  const memberIds = [...new Set(missing.map((invoice) => invoice.memberId))];
  for (const memberId of memberIds) {
    await withTransaction(deps.db, async (tx) => {
      await deps.members.lockMember(tx, ctx.tenantId, memberId);
      await syncMemberInvoices(deps, tx, ctx, memberId);
    });
  }
  return memberIds.length;
}

/**
 * Admission fee and security deposit, charged once when a member joins (inside the
 * members module's "add member" transaction).
 * @param {Deps} deps
 */
export async function createJoiningInvoices(
  deps,
  tx,
  ctx,
  memberId,
  { admissionFeePaise, depositPaise, joinedOn },
) {
  const charge = (kind, description, amountPaise) => ({
    id: crypto.randomUUID(),
    memberId,
    kind,
    description,
    amountPaise,
    dueOn: joinedOn,
    dedupeKey: `${kind}:${memberId}`,
    createdBy: ctx.actor.id,
  });
  const invoices = [
    admissionFeePaise > 0 && charge("admission", "Admission fee", admissionFeePaise),
    depositPaise > 0 && charge("deposit", "Security deposit (refundable)", depositPaise),
  ].filter(Boolean);
  await deps.invoices.insertInvoices(tx, ctx.tenantId, invoices);
}
