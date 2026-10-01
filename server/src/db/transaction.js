/**
 * @typedef {import("mysql2/promise").Pool | import("mysql2/promise").PoolConnection} Db
 * Repositories accept either: the pool for single statements, or a transaction's
 * connection so several statements commit or roll back together.
 */

/**
 * Run `work(tx)` inside a transaction; commit on success, roll back on any error.
 * @template T
 * @param {import("mysql2/promise").Pool} pool
 * @param {(tx: import("mysql2/promise").PoolConnection) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function withTransaction(pool, work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

/** First row of a SELECT, or null. */
export async function queryOne(db, sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows[0] || null;
}

/** All rows of a SELECT. */
export async function queryAll(db, sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

/** INSERT/UPDATE/DELETE; returns mysql2's ResultSetHeader (affectedRows, …). */
export async function execute(db, sql, params = []) {
  const [result] = await db.query(sql, params);
  return result;
}

/** True for MySQL's duplicate-key error, optionally on a specific unique key. */
export function isDuplicateKey(error, keyName) {
  if (!error || error.code !== "ER_DUP_ENTRY") return false;
  return keyName ? String(error.message).includes(keyName) : true;
}
