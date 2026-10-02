import { execute, queryAll, queryOne } from "../../db/transaction.js";
import { readJsonColumn } from "../../db/json.js";
import { buildPatch } from "../../db/patch.js";

const LIBRARY_COLUMNS =
  "l.id, l.slug, l.name, l.status, l.mocktest_share_bps, l.created_at, l.suspended_at";

function toLibrary(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    mocktestShareBps: row.mocktest_share_bps,
    createdAt: row.created_at,
    suspendedAt: row.suspended_at,
  };
}

/** Every library with its owner count and most recent staff sign-in. */
export async function listLibraries(db) {
  const rows = await queryAll(
    db,
    `SELECT ${LIBRARY_COLUMNS},
            SUM(u.role = 'admin') AS owner_count,
            MAX(u.last_login_at) AS last_login_at
       FROM libraries l
       LEFT JOIN users u ON u.tenant_id = l.id
      GROUP BY l.id
      ORDER BY l.created_at DESC`,
  );
  return rows.map((row) => ({
    ...toLibrary(row),
    ownerCount: Number(row.owner_count || 0),
    lastLoginAt: row.last_login_at,
  }));
}

export async function findLibraryById(db, id) {
  return toLibrary(
    await queryOne(db, `SELECT ${LIBRARY_COLUMNS} FROM libraries l WHERE l.id = ?`, [id]),
  );
}

export async function findLibraryBySlug(db, slug) {
  return toLibrary(
    await queryOne(db, `SELECT ${LIBRARY_COLUMNS} FROM libraries l WHERE l.slug = ?`, [slug]),
  );
}

export async function insertLibrary(db, { id, slug, name }) {
  await execute(db, "INSERT INTO libraries (id, slug, name) VALUES (?, ?, ?)", [id, slug, name]);
  // Every library has exactly one settings row from the start; defaults live in the schema.
  await execute(db, "INSERT INTO library_settings (tenant_id, display_name) VALUES (?, ?)", [
    id,
    name,
  ]);
}

/** @param {{ name?: string, mocktestShareBps?: number | null }} patch */
export async function updateLibrary(db, id, patch) {
  const set = buildPatch(patch, { name: "name", mocktestShareBps: "mocktest_share_bps" });
  if (!set) return;
  await execute(db, `UPDATE libraries SET ${set.assignments} WHERE id = ?`, [...set.params, id]);
}

export async function updateLibraryStatus(db, id, status) {
  await execute(
    db,
    `UPDATE libraries
        SET status = ?, suspended_at = IF(? = 'suspended', UTC_TIMESTAMP(), NULL)
      WHERE id = ?`,
    [status, status, id],
  );
}

/**
 * Size of a library for the super admin. Grows as modules land (members, seats,
 * subscriptions, storage); kept here so the usage screen has one query to call.
 */
export async function getLibraryUsage(db, id) {
  const row = await queryOne(
    db,
    `SELECT COUNT(*) AS user_count,
            SUM(role = 'admin') AS owner_count,
            SUM(role = 'staff') AS staff_count,
            MAX(last_login_at) AS last_login_at
       FROM users WHERE tenant_id = ?`,
    [id],
  );
  return {
    ownerCount: Number(row.owner_count || 0),
    staffCount: Number(row.staff_count || 0),
    lastLoginAt: row.last_login_at,
  };
}

export async function getPlatformSetting(db, key, fallback) {
  const row = await queryOne(
    db,
    "SELECT setting_value FROM platform_settings WHERE setting_key = ?",
    [key],
  );
  return row ? readJsonColumn(row.setting_value, fallback) : fallback;
}

export async function setPlatformSetting(db, key, value) {
  await execute(
    db,
    `INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, JSON.stringify(value)],
  );
}

/**
 * Store a setting only if it isn't there yet (first writer wins). Used for values
 * generated once, like the push keys, so two first requests can't store two pairs.
 */
export async function insertPlatformSettingIfAbsent(db, key, value) {
  await execute(
    db,
    "INSERT IGNORE INTO platform_settings (setting_key, setting_value) VALUES (?, ?)",
    [key, JSON.stringify(value)],
  );
}
