import { execute, queryAll, queryOne } from "../../db/transaction.js";
import { asJson, buildPatch } from "../../db/patch.js";
import { readJsonColumn } from "../../db/json.js";

// SQL for halls, hall_tables and seats. Every statement filters on tenant_id.

const toHall = (row) =>
  row && {
    id: row.id,
    name: row.name,
    seatingMode: row.seating_mode,
    categoryId: row.category_id,
    sortOrder: row.sort_order,
    status: row.status,
  };

const toTable = (row) =>
  row && { id: row.id, hallId: row.hall_id, label: row.label, sortOrder: row.sort_order };

const toSeat = (row) =>
  row && {
    id: row.id,
    tableId: row.table_id,
    label: row.label,
    sortOrder: row.sort_order,
    categoryId: row.category_id,
    features: readJsonColumn(row.features, []),
    status: row.status,
  };

// ── Reads ──────────────────────────────────────────────────────────────
export async function listHalls(db, tenantId) {
  const rows = await queryAll(
    db,
    "SELECT * FROM halls WHERE tenant_id = ? ORDER BY sort_order, name",
    [tenantId],
  );
  return rows.map(toHall);
}

export async function listTables(db, tenantId) {
  const rows = await queryAll(
    db,
    "SELECT * FROM hall_tables WHERE tenant_id = ? ORDER BY sort_order",
    [tenantId],
  );
  return rows.map(toTable);
}

export async function listSeats(db, tenantId) {
  const rows = await queryAll(db, "SELECT * FROM seats WHERE tenant_id = ? ORDER BY sort_order", [
    tenantId,
  ]);
  return rows.map(toSeat);
}

/** `forUpdate` locks the hall row so concurrent bulk adds number tables one after another. */
export async function findHall(db, tenantId, id, { forUpdate = false } = {}) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  return toHall(
    await queryOne(db, `SELECT * FROM halls WHERE tenant_id = ? AND id = ?${lock}`, [tenantId, id]),
  );
}

export async function findTable(db, tenantId, id) {
  return toTable(
    await queryOne(db, "SELECT * FROM hall_tables WHERE tenant_id = ? AND id = ?", [tenantId, id]),
  );
}

export async function findSeat(db, tenantId, id) {
  return toSeat(
    await queryOne(db, "SELECT * FROM seats WHERE tenant_id = ? AND id = ?", [tenantId, id]),
  );
}

export async function listTablesOfHall(db, tenantId, hallId) {
  const rows = await queryAll(db, "SELECT * FROM hall_tables WHERE tenant_id = ? AND hall_id = ?", [
    tenantId,
    hallId,
  ]);
  return rows.map(toTable);
}

export async function listSeatsOfTable(db, tenantId, tableId) {
  const rows = await queryAll(db, "SELECT * FROM seats WHERE tenant_id = ? AND table_id = ?", [
    tenantId,
    tableId,
  ]);
  return rows.map(toSeat);
}

/** Which of these labels already exist in the library (case-insensitive, like the unique key). */
export async function findExistingSeatLabels(db, tenantId, labels) {
  if (labels.length === 0) return [];
  const rows = await queryAll(db, "SELECT label FROM seats WHERE tenant_id = ? AND label IN (?)", [
    tenantId,
    labels,
  ]);
  return rows.map((row) => row.label);
}

// ── Writes ─────────────────────────────────────────────────────────────
export async function insertHall(db, tenantId, hall) {
  await execute(
    db,
    `INSERT INTO halls (id, tenant_id, name, seating_mode, category_id, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [hall.id, tenantId, hall.name, hall.seatingMode, hall.categoryId, hall.sortOrder],
  );
}

export async function updateHall(db, tenantId, id, patch) {
  const set = buildPatch(patch, {
    name: "name",
    seatingMode: "seating_mode",
    categoryId: "category_id",
    status: "status",
    sortOrder: "sort_order",
  });
  if (set)
    await execute(db, `UPDATE halls SET ${set.assignments} WHERE tenant_id = ? AND id = ?`, [
      ...set.params,
      tenantId,
      id,
    ]);
}

/** @param {{ id: string, hallId: string, label: string, sortOrder: number }[]} tables */
export async function insertTables(db, tenantId, tables) {
  if (tables.length === 0) return;
  const rows = tables.map((t) => [t.id, tenantId, t.hallId, t.label, t.sortOrder]);
  await execute(
    db,
    "INSERT INTO hall_tables (id, tenant_id, hall_id, label, sort_order) VALUES ?",
    [rows],
  );
}

export async function updateTable(db, tenantId, id, patch) {
  const set = buildPatch(patch, { label: "label", sortOrder: "sort_order" });
  if (set)
    await execute(db, `UPDATE hall_tables SET ${set.assignments} WHERE tenant_id = ? AND id = ?`, [
      ...set.params,
      tenantId,
      id,
    ]);
}

/** @param {{ id: string, tableId: string, label: string, sortOrder: number, categoryId: string | null }[]} seats */
export async function insertSeats(db, tenantId, seats) {
  if (seats.length === 0) return;
  const rows = seats.map((s) => [
    s.id,
    tenantId,
    s.tableId,
    s.label,
    s.sortOrder,
    s.categoryId,
    "[]",
  ]);
  await execute(
    db,
    "INSERT INTO seats (id, tenant_id, table_id, label, sort_order, category_id, features) VALUES ?",
    [rows],
  );
}

export async function updateSeat(db, tenantId, id, patch) {
  const set = buildPatch(patch, {
    label: "label",
    categoryId: "category_id",
    features: asJson("features"),
    status: "status",
    sortOrder: "sort_order",
  });
  if (set)
    await execute(db, `UPDATE seats SET ${set.assignments} WHERE tenant_id = ? AND id = ?`, [
      ...set.params,
      tenantId,
      id,
    ]);
}

// Deletes: a foreign key from history (seat allocations, milestone 3) makes MySQL
// refuse, which the error handler reports as IN_USE ("disable it instead").
export async function deleteSeat(db, tenantId, id) {
  await execute(db, "DELETE FROM seats WHERE tenant_id = ? AND id = ?", [tenantId, id]);
}

export async function deleteTableWithSeats(db, tenantId, id) {
  await execute(db, "DELETE FROM seats WHERE tenant_id = ? AND table_id = ?", [tenantId, id]);
  await execute(db, "DELETE FROM hall_tables WHERE tenant_id = ? AND id = ?", [tenantId, id]);
}

export async function deleteHallWithContents(db, tenantId, id) {
  await execute(
    db,
    `DELETE s FROM seats s JOIN hall_tables t ON t.id = s.table_id
      WHERE s.tenant_id = ? AND t.hall_id = ?`,
    [tenantId, id],
  );
  await execute(db, "DELETE FROM hall_tables WHERE tenant_id = ? AND hall_id = ?", [tenantId, id]);
  await execute(db, "DELETE FROM halls WHERE tenant_id = ? AND id = ?", [tenantId, id]);
}
