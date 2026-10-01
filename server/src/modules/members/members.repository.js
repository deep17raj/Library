import { execute, queryAll, queryOne } from "../../db/transaction.js";
import { buildPatch } from "../../db/patch.js";

// SQL for the `members` table (students of a library).

const toMember = (row) =>
  row && {
    id: row.id,
    memberCode: row.member_code,
    name: row.name,
    phone: row.phone,
    address: row.address,
    examTarget: row.exam_target,
    notes: row.notes,
    joinedOn: row.joined_on,
    status: row.status,
    photoPath: row.photo_path,
    idProofPath: row.id_proof_path,
    createdAt: row.created_at,
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

export async function findMemberByPhone(db, tenantId, phone) {
  return toMember(
    await queryOne(db, "SELECT * FROM members WHERE tenant_id = ? AND phone = ?", [
      tenantId,
      phone,
    ]),
  );
}

export async function insertMember(db, tenantId, member) {
  await execute(
    db,
    `INSERT INTO members (id, tenant_id, member_code, name, phone, address, exam_target, notes, joined_on)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      member.id,
      tenantId,
      member.memberCode,
      member.name,
      member.phone,
      member.address,
      member.examTarget,
      member.notes,
      member.joinedOn,
    ],
  );
}

export async function updateMember(db, tenantId, id, patch) {
  const set = buildPatch(patch, {
    name: "name",
    phone: "phone",
    address: "address",
    examTarget: "exam_target",
    notes: "notes",
    status: "status",
    photoPath: "photo_path",
    idProofPath: "id_proof_path",
  });
  if (!set) return;
  await execute(db, `UPDATE members SET ${set.assignments} WHERE tenant_id = ? AND id = ?`, [
    ...set.params,
    tenantId,
    id,
  ]);
}

const escapeLike = (text) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * One page of members, newest first, with the total for paging.
 * `q` matches name, phone or member code; `slotId` keeps members active in that slot.
 */
export async function listMembers(db, tenantId, { q, status, slotId, page, pageSize }) {
  const where = ["m.tenant_id = ?"];
  const params = [tenantId];
  if (status !== "all") {
    where.push("m.status = ?");
    params.push(status);
  }
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where.push("(m.name LIKE ? OR m.phone LIKE ? OR m.member_code LIKE ?)");
    params.push(pattern, pattern, pattern);
  }
  if (slotId) {
    where.push(`EXISTS (SELECT 1 FROM subscriptions s
                         WHERE s.member_id = m.id AND s.slot_id = ? AND s.status = 'active')`);
    params.push(slotId);
  }
  const clause = where.join(" AND ");
  const [{ total }] = await queryAll(
    db,
    `SELECT COUNT(*) AS total FROM members m WHERE ${clause}`,
    params,
  );
  const rows = await queryAll(
    db,
    `SELECT m.* FROM members m WHERE ${clause} ORDER BY m.created_at DESC, m.member_code DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { members: rows.map(toMember), total: Number(total) };
}
