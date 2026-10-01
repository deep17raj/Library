/**
 * MySQL 8 returns JSON columns already parsed; MariaDB (common on cPanel) stores
 * JSON as LONGTEXT and returns a string. Repositories read JSON through this.
 * @template T
 * @param {unknown} value
 * @param {T} fallback
 * @returns {T}
 */
export function readJsonColumn(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return /** @type {T} */ (value);
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
