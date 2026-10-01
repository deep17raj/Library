import { execute, queryAll, queryOne } from "../../db/transaction.js";
import { buildPatch } from "../../db/patch.js";

function toCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    monthlySurchargePaise: row.monthly_surcharge_paise,
    sortOrder: row.sort_order,
    status: row.status,
  };
}

export async function listCategories(db, tenantId) {
  const rows = await queryAll(
    db,
    "SELECT * FROM seat_categories WHERE tenant_id = ? ORDER BY sort_order, name",
    [tenantId],
  );
  return rows.map(toCategory);
}

export async function findCategory(db, tenantId, id) {
  return toCategory(
    await queryOne(db, "SELECT * FROM seat_categories WHERE tenant_id = ? AND id = ?", [
      tenantId,
      id,
    ]),
  );
}

export async function insertCategory(db, tenantId, { id, name, monthlySurchargePaise, sortOrder }) {
  await execute(
    db,
    `INSERT INTO seat_categories (id, tenant_id, name, monthly_surcharge_paise, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [id, tenantId, name, monthlySurchargePaise, sortOrder],
  );
}

export async function updateCategory(db, tenantId, id, patch) {
  const set = buildPatch(patch, {
    name: "name",
    monthlySurchargePaise: "monthly_surcharge_paise",
    status: "status",
  });
  if (!set) return;
  await execute(
    db,
    `UPDATE seat_categories SET ${set.assignments} WHERE tenant_id = ? AND id = ?`,
    [...set.params, tenantId, id],
  );
}
