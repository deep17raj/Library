import { execute, queryAll, queryOne } from "../../db/transaction.js";
import { buildPatch } from "../../db/patch.js";
import { readJsonColumn } from "../../db/json.js";

const toEntry = (row) =>
  row && {
    id: row.id,
    slotId: row.slot_id,
    slotName: row.slot_name,
    memberId: row.member_id,
    name: row.name,
    phone: row.phone,
    preferredFeatures: readJsonColumn(row.preferred_features, []),
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };

const SELECT_ENTRY = `SELECT w.*, sl.name AS slot_name FROM waitlist_entries w JOIN slots sl ON sl.id = w.slot_id`;

/** Open entries (waiting/offered) oldest first — the queue order — or every entry. */
export async function listEntries(db, tenantId, { slotId, open }) {
  const where = ["w.tenant_id = ?"];
  const params = [tenantId];
  if (slotId) {
    where.push("w.slot_id = ?");
    params.push(slotId);
  }
  if (open) where.push("w.status IN ('waiting','offered')");
  const rows = await queryAll(
    db,
    `${SELECT_ENTRY} WHERE ${where.join(" AND ")} ORDER BY w.queue_no`,
    params,
  );
  return rows.map(toEntry);
}

export async function findEntry(db, tenantId, id) {
  return toEntry(
    await queryOne(db, `${SELECT_ENTRY} WHERE w.tenant_id = ? AND w.id = ?`, [tenantId, id]),
  );
}

export async function insertEntry(db, tenantId, entry) {
  await execute(
    db,
    `INSERT INTO waitlist_entries (id, tenant_id, slot_id, name, phone, preferred_features, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      tenantId,
      entry.slotId,
      entry.name,
      entry.phone,
      JSON.stringify(entry.preferredFeatures),
      entry.note,
      entry.createdBy,
    ],
  );
}

export async function updateEntry(db, tenantId, id, patch) {
  const set = buildPatch(patch, { status: "status", note: "note" });
  if (!set) return;
  const resolved = patch.status === "cancelled" ? ", resolved_at = UTC_TIMESTAMP()" : "";
  await execute(
    db,
    `UPDATE waitlist_entries SET ${set.assignments}${resolved} WHERE tenant_id = ? AND id = ?`,
    [...set.params, tenantId, id],
  );
}

/** @returns {Promise<boolean>} false when the entry was not open any more */
export async function markConverted(db, tenantId, id, memberId) {
  const result = await execute(
    db,
    `UPDATE waitlist_entries SET status = 'converted', member_id = ?, resolved_at = UTC_TIMESTAMP()
      WHERE tenant_id = ? AND id = ? AND status IN ('waiting','offered')`,
    [memberId, tenantId, id],
  );
  return result.affectedRows > 0;
}
