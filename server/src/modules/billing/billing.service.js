import { bindDeps } from "../../lib/bindDeps.js";
import { recordAudit } from "../audit/audit.repository.js";
import * as membersRepository from "../members/members.repository.js";
import * as settingsRepository from "../settings/settings.repository.js";
import { billingSettings, libraryToday } from "../settings/librarySettings.js";
import * as invoicesRepository from "./invoices.repository.js";
import * as paymentsRepository from "./payments.repository.js";
import { addCharge, getMemberAccount, setDiscount, voidInvoice } from "./account.js";
import { listDues } from "./dues.js";
import { createJoiningInvoices, syncLibraryInvoices, syncMemberInvoices } from "./invoicing.js";
import {
  collectPayment,
  getReceipt,
  listPayments,
  refundDeposit,
  voidPayment,
} from "./payments.js";

/**
 * @typedef {Object} BillingDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof invoicesRepository} invoices
 * @property {typeof paymentsRepository} payments
 * @property {typeof membersRepository} members
 * @property {typeof settingsRepository} settings
 * @property {{ today: typeof libraryToday, billing: typeof billingSettings }} calendar
 * @property {{ recordAudit: typeof recordAudit }} audit
 */

/**
 * A member's money: invoices (generated per billing period), payments (allocated to
 * invoices, extra = credit), discounts, deposit refunds, dues.
 * `createJoiningInvoices` and `syncMemberInvoices` take the caller's transaction (the
 * members module uses them when adding a member).
 */
export function createBillingService({
  db,
  invoices = invoicesRepository,
  payments = paymentsRepository,
  members = membersRepository,
  settings = settingsRepository,
  calendar = { today: (tx, tenantId) => libraryToday(tx, tenantId), billing: billingSettings },
  audit = { recordAudit },
}) {
  return bindDeps(
    { db, invoices, payments, members, settings, calendar, audit },
    {
      getMemberAccount,
      addCharge,
      setDiscount,
      voidInvoice,
      collectPayment,
      getReceipt,
      listPayments,
      voidPayment,
      refundDeposit: async (deps, ctx, invoiceId, input) =>
        getMemberAccount(deps, ctx, await refundDeposit(deps, ctx, invoiceId, input)),
      listDues,
      memberOverduePaise,
      syncLibraryInvoices,
      syncMemberInvoices,
      createJoiningInvoices,
    },
  );
}

/**
 * How much a member owes that is already due — the check-in dues gate (§9). A fast read,
 * so it does not generate invoices; the next account view or the hourly job does that.
 * @param {import("./billing.service.js").BillingDeps} deps
 */
async function memberOverduePaise(deps, ctx, memberId) {
  const today = await deps.calendar.today(deps.db, ctx.tenantId);
  return deps.invoices.overduePaiseOfMember(deps.db, ctx.tenantId, memberId, today);
}
