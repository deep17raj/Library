import { execute, queryAll, queryOne } from "../../db/transaction.js";
import { readJsonColumn } from "../../db/json.js";

// SQL for the `users` table (staff, owners, super admins). Owned by the auth
// module; other modules (platform, staff) use these functions instead of writing
// their own user SQL.

const USER_COLUMNS = `
  u.id, u.tenant_id, u.email, u.password_hash, u.name, u.role, u.permissions, u.status,
  u.token_version, u.last_login_at, u.created_at,
  l.slug AS library_slug, l.name AS library_name, l.status AS library_status`;

/**
 * @typedef {Object} UserRecord
 * @property {string} id
 * @property {string | null} tenantId
 * @property {string} email
 * @property {string} passwordHash
 * @property {string} name
 * @property {"super_admin" | "admin" | "staff"} role
 * @property {string[]} permissions
 * @property {"active" | "disabled"} status
 * @property {number} tokenVersion
 * @property {Date | null} lastLoginAt
 * @property {Date} createdAt
 * @property {{ id: string, slug: string, name: string, status: string } | null} library
 */

/** @returns {UserRecord | null} */
function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role,
    permissions: readJsonColumn(row.permissions, []),
    status: row.status,
    tokenVersion: row.token_version,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    library: row.tenant_id
      ? {
          id: row.tenant_id,
          slug: row.library_slug,
          name: row.library_name,
          status: row.library_status,
        }
      : null,
  };
}

export async function findUserByEmail(db, email) {
  return toUser(
    await queryOne(
      db,
      `SELECT ${USER_COLUMNS} FROM users u LEFT JOIN libraries l ON l.id = u.tenant_id WHERE u.email = ?`,
      [email],
    ),
  );
}

export async function findUserById(db, id) {
  return toUser(
    await queryOne(
      db,
      `SELECT ${USER_COLUMNS} FROM users u LEFT JOIN libraries l ON l.id = u.tenant_id WHERE u.id = ?`,
      [id],
    ),
  );
}

/** Owners/staff of one library, newest first. */
export async function listUsersOfLibrary(db, tenantId) {
  const rows = await queryAll(
    db,
    `SELECT ${USER_COLUMNS} FROM users u LEFT JOIN libraries l ON l.id = u.tenant_id
     WHERE u.tenant_id = ? ORDER BY u.created_at DESC`,
    [tenantId],
  );
  return rows.map(toUser);
}

export async function countUsersWithRole(db, role) {
  const row = await queryOne(db, "SELECT COUNT(*) AS total FROM users WHERE role = ?", [role]);
  return Number(row.total);
}

/**
 * @param {import("../../db/transaction.js").Db} db
 * @param {{ id: string, tenantId: string | null, email: string, passwordHash: string,
 *   name: string, role: string, permissions?: string[] | null }} user
 */
export async function insertUser(db, user) {
  await execute(
    db,
    `INSERT INTO users (id, tenant_id, email, password_hash, name, role, permissions)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.tenantId,
      user.email,
      user.passwordHash,
      user.name,
      user.role,
      user.permissions ? JSON.stringify(user.permissions) : null,
    ],
  );
}

export async function touchLastLogin(db, id) {
  await execute(db, "UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
}

/** New password ends every existing session of the user (token_version + 1). */
export async function updatePassword(db, id, passwordHash) {
  await execute(
    db,
    "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
    [passwordHash, id],
  );
}

/** Disabling also bumps token_version so open sessions end immediately. */
export async function updateUserStatus(db, id, status) {
  const result = await execute(
    db,
    "UPDATE users SET status = ?, token_version = token_version + 1 WHERE id = ?",
    [status, id],
  );
  return result.affectedRows > 0;
}

// ── Library-scoped versions: used by the staff module. Every statement filters on
// tenant_id, so a staff manager can never touch another library's logins. ──

export async function findLibraryUser(db, tenantId, id) {
  return toUser(
    await queryOne(
      db,
      `SELECT ${USER_COLUMNS} FROM users u LEFT JOIN libraries l ON l.id = u.tenant_id
       WHERE u.tenant_id = ? AND u.id = ?`,
      [tenantId, id],
    ),
  );
}

/** Permissions are re-read on every request, so changing them needs no sign-out. */
export async function updateLibraryUserProfile(db, tenantId, id, { name, permissions }) {
  await execute(
    db,
    `UPDATE users SET name = COALESCE(?, name), permissions = COALESCE(?, permissions)
      WHERE tenant_id = ? AND id = ?`,
    [name ?? null, permissions ? JSON.stringify(permissions) : null, tenantId, id],
  );
}

export async function setLibraryUserStatus(db, tenantId, id, status) {
  await execute(
    db,
    "UPDATE users SET status = ?, token_version = token_version + 1 WHERE tenant_id = ? AND id = ?",
    [status, tenantId, id],
  );
}

export async function setLibraryUserPassword(db, tenantId, id, passwordHash) {
  await execute(
    db,
    `UPDATE users SET password_hash = ?, token_version = token_version + 1
      WHERE tenant_id = ? AND id = ?`,
    [passwordHash, tenantId, id],
  );
}
