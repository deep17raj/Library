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

/** The billing settings subscriptions need when they are created or changed. */
export async function billingSettings(db, tenantId) {
  const row = await queryOne(
    db,
    "SELECT billing_anchor, default_collection FROM library_settings WHERE tenant_id = ?",
    [tenantId],
  );
  return {
    anchor: row?.billing_anchor || "join_date",
    defaultCollection: row?.default_collection || "advance",
  };
}
