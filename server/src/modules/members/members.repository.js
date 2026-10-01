import { queryOne } from "../../db/transaction.js";

// SQL for the `members` table. Milestone 3 only needs to find and lock a member;
// the full members module (create, edit, list, photos) arrives in milestone 4.

const toMember = (row) =>
  row && {
    id: row.id,
    memberCode: row.member_code,
    name: row.name,
    phone: row.phone,
    status: row.status,
  };

export async function findMember(db, tenantId, id) {
  return toMember(
    await queryOne(db, "SELECT * FROM members WHERE tenant_id = ? AND id = ?", [tenantId, id]),
  );
}

/**
 * Lock the member row. Every seating change locks the member first (then halls or
 * seats), so two changes for one student run one after the other and can't both
 * pass the "no two overlapping slots" check.
 */
export async function lockMember(db, tenantId, id) {
  return toMember(
    await queryOne(db, "SELECT * FROM members WHERE tenant_id = ? AND id = ? FOR UPDATE", [
      tenantId,
      id,
    ]),
  );
}
