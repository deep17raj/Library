import { execute, queryAll, queryOne } from "../../db/transaction.js";

// SQL for seats as places: seat/hall details for placement, seat_allocations and the
// seat_allocation_cells overlap guard (docs/ARCHITECTURE.md §7).

/** Lock one seat row: every allocation change on a seat waits its turn here. */
export async function lockSeat(db, tenantId, seatId) {
  return queryOne(db, "SELECT id FROM seats WHERE tenant_id = ? AND id = ? FOR UPDATE", [
    tenantId,
    seatId,
  ]);
}

/** Lock one hall row: sit-anywhere capacity checks wait their turn here. */
export async function lockHall(db, tenantId, hallId) {
  return queryOne(db, "SELECT id FROM halls WHERE tenant_id = ? AND id = ? FOR UPDATE", [
    tenantId,
    hallId,
  ]);
}

/** Seat + its hall + the surcharge that applies to it. */
export async function findSeatPlace(db, tenantId, seatId) {
  return queryOne(
    db,
    `SELECT st.id AS seatId, st.label, st.status AS seatStatus, t.hall_id AS hallId, h.name AS hallName,
            h.status AS hallStatus, h.seating_mode AS seatingMode,
            COALESCE(c.monthly_surcharge_paise, 0) AS monthlySurchargePaise
       FROM seats st
       JOIN hall_tables t ON t.id = st.table_id
       JOIN halls h ON h.id = t.hall_id
       LEFT JOIN seat_categories c ON c.id = st.category_id
      WHERE st.tenant_id = ? AND st.id = ?`,
    [tenantId, seatId],
  );
}

/** Hall + its capacity (active seats) + the surcharge of its category. */
export async function findHallPlace(db, tenantId, hallId) {
  return queryOne(
    db,
    `SELECT h.id AS hallId, h.name AS hallName, h.status AS hallStatus, h.seating_mode AS seatingMode,
            COALESCE(c.monthly_surcharge_paise, 0) AS monthlySurchargePaise,
            (SELECT COUNT(*) FROM seats st JOIN hall_tables t ON t.id = st.table_id
              WHERE t.hall_id = h.id AND st.status = 'active') AS capacity
       FROM halls h LEFT JOIN seat_categories c ON c.id = h.category_id
      WHERE h.tenant_id = ? AND h.id = ?`,
    [tenantId, hallId],
  );
}

/** Who holds this seat now, with their slot times. */
export async function listActiveAllocationsOnSeat(db, tenantId, seatId) {
  return queryAll(
    db,
    `SELECT a.id AS allocationId, a.subscription_id AS subscriptionId, m.name AS memberName,
            sl.name AS slotName, sl.start_min AS startMin, sl.end_min AS endMin
       FROM seat_allocations a
       JOIN members m ON m.id = a.member_id
       JOIN slots sl ON sl.id = a.slot_id
      WHERE a.tenant_id = ? AND a.seat_id = ? AND a.status = 'active'
      ORDER BY sl.start_min`,
    [tenantId, seatId],
  );
}

export async function countActiveAllocationsOnSeat(db, tenantId, seatId) {
  const row = await queryOne(
    db,
    "SELECT COUNT(*) AS total FROM seat_allocations WHERE tenant_id = ? AND seat_id = ? AND status = 'active'",
    [tenantId, seatId],
  );
  return Number(row.total);
}

export async function insertAllocation(db, tenantId, allocation) {
  await execute(
    db,
    `INSERT INTO seat_allocations (id, tenant_id, subscription_id, member_id, seat_id, slot_id, start_on, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      allocation.id,
      tenantId,
      allocation.subscriptionId,
      allocation.memberId,
      allocation.seatId,
      allocation.slotId,
      allocation.startOn,
      allocation.createdBy,
    ],
  );
}

/** Throws ER_DUP_ENTRY if any cell of this seat is already held — the DB guard. */
export async function insertCells(db, tenantId, seatId, allocationId, cells) {
  if (cells.length === 0) return;
  const rows = cells.map((cell) => [seatId, cell, tenantId, allocationId]);
  await execute(
    db,
    "INSERT INTO seat_allocation_cells (seat_id, cell, tenant_id, allocation_id) VALUES ?",
    [rows],
  );
}

/** End an allocation and free its cells. */
export async function endAllocation(db, tenantId, allocationId, { reason, endOn }) {
  await execute(db, "DELETE FROM seat_allocation_cells WHERE tenant_id = ? AND allocation_id = ?", [
    tenantId,
    allocationId,
  ]);
  await execute(
    db,
    `UPDATE seat_allocations SET status = 'ended', end_reason = ?, end_on = ?, ended_at = UTC_TIMESTAMP()
      WHERE tenant_id = ? AND id = ?`,
    [reason, endOn, tenantId, allocationId],
  );
}

export async function deleteCellsOfAllocations(db, tenantId, allocationIds) {
  if (allocationIds.length === 0) return;
  await execute(
    db,
    "DELETE FROM seat_allocation_cells WHERE tenant_id = ? AND allocation_id IN (?)",
    [tenantId, allocationIds],
  );
}

/** Active seats in active fixed halls with none of these cells taken. */
export async function listFreeSeatIds(db, tenantId, cells) {
  const rows = await queryAll(
    db,
    `SELECT st.id FROM seats st
       JOIN hall_tables t ON t.id = st.table_id
       JOIN halls h ON h.id = t.hall_id
      WHERE st.tenant_id = ? AND st.status = 'active' AND h.status = 'active' AND h.seating_mode = 'fixed'
        AND NOT EXISTS (SELECT 1 FROM seat_allocation_cells c WHERE c.seat_id = st.id AND c.cell IN (?))`,
    [tenantId, cells],
  );
  return rows.map((row) => row.id);
}

/** Active sit-anywhere halls with their capacity. */
export async function listFloatingHalls(db, tenantId) {
  return queryAll(
    db,
    `SELECT h.id AS hallId, h.name AS hallName,
            (SELECT COUNT(*) FROM seats st JOIN hall_tables t ON t.id = st.table_id
              WHERE t.hall_id = h.id AND st.status = 'active') AS capacity
       FROM halls h WHERE h.tenant_id = ? AND h.status = 'active' AND h.seating_mode = 'floating'
      ORDER BY h.sort_order, h.name`,
    [tenantId],
  );
}
