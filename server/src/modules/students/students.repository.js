import { execute, queryOne } from "../../db/transaction.js";

// SQL for a member's student-app account: the login columns of `members`. Kept apart
// from members.repository so the password hash never travels with a member profile.

const toAccount = (row) =>
  row && {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    phone: row.phone,
    memberCode: row.member_code,
    status: row.status,
    passwordHash: row.password_hash,
    mustChangePassword: Boolean(row.must_change_password),
    tokenVersion: row.token_version,
    lastLoginAt: row.app_last_login_at,
  };

const COLUMNS = `id, tenant_id, name, phone, member_code, status, password_hash,
  must_change_password, token_version, app_last_login_at`;

export async function findAccountByPhone(db, tenantId, phone) {
  return toAccount(
    await queryOne(db, `SELECT ${COLUMNS} FROM members WHERE tenant_id = ? AND phone = ?`, [
      tenantId,
      phone,
    ]),
  );
}

export async function findAccountById(db, tenantId, id) {
  return toAccount(
    await queryOne(db, `SELECT ${COLUMNS} FROM members WHERE tenant_id = ? AND id = ?`, [
      tenantId,
      id,
    ]),
  );
}

/**
 * Set a new password. Bumping token_version signs the student out everywhere (a reset
 * by staff, or the student's own change on another phone).
 */
export async function setPassword(db, tenantId, id, { passwordHash, mustChangePassword }) {
  await execute(
    db,
    `UPDATE members
        SET password_hash = ?, must_change_password = ?, token_version = token_version + 1
      WHERE tenant_id = ? AND id = ?`,
    [passwordHash, mustChangePassword ? 1 : 0, tenantId, id],
  );
}

export async function touchAppLogin(db, tenantId, id) {
  await execute(
    db,
    "UPDATE members SET app_last_login_at = UTC_TIMESTAMP() WHERE tenant_id = ? AND id = ?",
    [tenantId, id],
  );
}
