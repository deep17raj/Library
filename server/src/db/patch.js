/**
 * Build the SET part of a partial UPDATE from a validated patch object. Only keys
 * listed in `columns` can reach SQL, and only when they are present in the patch,
 * so `{ name: undefined }` leaves the column alone while `{ categoryId: null }` clears it.
 *
 * @param {Record<string, unknown>} patch
 * @param {Record<string, string | { column: string, toDb: (value: any) => unknown }>} columns
 *   patch key → column name (or column + converter, e.g. JSON.stringify)
 * @returns {{ assignments: string, params: unknown[] } | null} null when nothing to update
 */
export function buildPatch(patch, columns) {
  const parts = [];
  const params = [];
  for (const [key, target] of Object.entries(columns)) {
    if (patch[key] === undefined) continue;
    const { column, toDb } =
      typeof target === "string" ? { column: target, toDb: (v) => v } : target;
    parts.push(`${column} = ?`);
    params.push(toDb(patch[key]));
  }
  return parts.length ? { assignments: parts.join(", "), params } : null;
}

export const asJson = (column) => ({ column, toDb: (value) => JSON.stringify(value) });
