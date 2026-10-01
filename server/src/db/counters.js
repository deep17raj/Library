import { execute, queryOne } from "./transaction.js";

/**
 * Next number of a per-library sequence (member codes, receipt numbers). Must run in
 * the transaction that uses the number: the counter row stays locked until commit,
 * so two people saving at once get consecutive numbers, never the same one — and a
 * rolled-back save gives its number back.
 * @param {import("./transaction.js").Db} tx
 * @param {string} tenantId
 * @param {string} name   e.g. "member_code"
 * @param {number} first  value of a brand-new sequence
 */
export async function takeNextNumber(tx, tenantId, name, first) {
  await execute(tx, "INSERT IGNORE INTO counters (tenant_id, name, next_value) VALUES (?, ?, ?)", [
    tenantId,
    name,
    first,
  ]);
  const row = await queryOne(
    tx,
    "SELECT next_value FROM counters WHERE tenant_id = ? AND name = ? FOR UPDATE",
    [tenantId, name],
  );
  await execute(
    tx,
    "UPDATE counters SET next_value = next_value + 1 WHERE tenant_id = ? AND name = ?",
    [tenantId, name],
  );
  return row.next_value;
}
