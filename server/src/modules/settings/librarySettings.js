import { localDateOf } from "@app/shared/time";
import { queryOne } from "../../db/transaction.js";

/**
 * Today's date in the library's own timezone — the only way the server decides
 * "today" for business rules (CLAUDE.md: never `new Date()` for that).
 * @param {import("../../db/transaction.js").Db} db
 * @param {string} tenantId
 * @param {Date} now injectable for tests
 */
export async function libraryToday(db, tenantId, now = new Date()) {
  const row = await queryOne(db, "SELECT timezone FROM library_settings WHERE tenant_id = ?", [
    tenantId,
  ]);
  return localDateOf(now, row?.timezone || "Asia/Kolkata");
}

/** The billing rules subscriptions and invoices follow (Settings → Billing). */
export async function billingSettings(db, tenantId) {
  const row = await queryOne(
    db,
    `SELECT billing_anchor, first_period_billing, default_collection, grace_days,
            auto_release_unpaid, receipt_prefix
       FROM library_settings WHERE tenant_id = ?`,
    [tenantId],
  );
  return {
    anchor: row?.billing_anchor || "join_date",
    firstPeriodBilling: row?.first_period_billing || "full",
    defaultCollection: row?.default_collection || "advance",
    graceDays: row?.grace_days ?? 7,
    autoReleaseUnpaid: Boolean(row?.auto_release_unpaid),
    receiptPrefix: row?.receipt_prefix ?? "R",
  };
}

/** "S" → member codes S1001, S1002… */
export async function memberCodePrefix(db, tenantId) {
  const row = await queryOne(
    db,
    "SELECT member_code_prefix FROM library_settings WHERE tenant_id = ?",
    [tenantId],
  );
  return row?.member_code_prefix ?? "S";
}
