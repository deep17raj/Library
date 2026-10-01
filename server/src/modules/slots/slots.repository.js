import { execute, queryAll, queryOne } from "../../db/transaction.js";
import { buildPatch } from "../../db/patch.js";

const toSlot = (row) =>
  row && {
    id: row.id,
    name: row.name,
    startMin: row.start_min,
    endMin: row.end_min,
    color: row.color,
    sortOrder: row.sort_order,
    status: row.status,
  };

const toPlan = (row) =>
  row && {
    id: row.id,
    slotId: row.slot_id,
    name: row.name,
    periodUnit: row.period_unit,
    periodCount: row.period_count,
    pricePaise: row.price_paise,
    isDefault: Boolean(row.is_default),
    status: row.status,
  };

export async function listSlots(db, tenantId) {
  const rows = await queryAll(
    db,
    "SELECT * FROM slots WHERE tenant_id = ? ORDER BY sort_order, start_min",
    [tenantId],
  );
  return rows.map(toSlot);
}

/** Default plan first, then shortest to longest. */
export async function listPlans(db, tenantId) {
  const rows = await queryAll(
    db,
    `SELECT * FROM plans WHERE tenant_id = ?
      ORDER BY is_default DESC, period_unit = 'month', period_count`,
    [tenantId],
  );
  return rows.map(toPlan);
}

/**
 * `forUpdate`: changing the slot's times. `forShare`: seating someone in it — many
 * can seat at once, but not while the times are being changed.
 */
export async function findSlot(db, tenantId, id, { forUpdate = false, forShare = false } = {}) {
  const lock = forUpdate ? " FOR UPDATE" : forShare ? " LOCK IN SHARE MODE" : "";
  return toSlot(
    await queryOne(db, `SELECT * FROM slots WHERE tenant_id = ? AND id = ?${lock}`, [tenantId, id]),
  );
}

export async function findPlan(db, tenantId, id) {
  return toPlan(
    await queryOne(db, "SELECT * FROM plans WHERE tenant_id = ? AND id = ?", [tenantId, id]),
  );
}

export async function insertSlot(db, tenantId, slot) {
  await execute(
    db,
    `INSERT INTO slots (id, tenant_id, name, start_min, end_min, color, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [slot.id, tenantId, slot.name, slot.startMin, slot.endMin, slot.color || "", slot.sortOrder],
  );
}

export async function updateSlot(db, tenantId, id, patch) {
  const set = buildPatch(patch, {
    name: "name",
    startMin: "start_min",
    endMin: "end_min",
    color: "color",
    status: "status",
    sortOrder: "sort_order",
  });
  if (set)
    await execute(db, `UPDATE slots SET ${set.assignments} WHERE tenant_id = ? AND id = ?`, [
      ...set.params,
      tenantId,
      id,
    ]);
}

export async function insertPlan(db, tenantId, plan) {
  await execute(
    db,
    `INSERT INTO plans (id, tenant_id, slot_id, name, period_unit, period_count, price_paise, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      plan.id,
      tenantId,
      plan.slotId,
      plan.name,
      plan.periodUnit,
      plan.periodCount,
      plan.pricePaise,
      plan.isDefault ? 1 : 0,
    ],
  );
}

export async function updatePlan(db, tenantId, id, patch) {
  const set = buildPatch(patch, { name: "name", pricePaise: "price_paise", status: "status" });
  if (set)
    await execute(db, `UPDATE plans SET ${set.assignments} WHERE tenant_id = ? AND id = ?`, [
      ...set.params,
      tenantId,
      id,
    ]);
}
