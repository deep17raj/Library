import { execute, queryAll, queryOne } from "../../db/transaction.js";

// SQL only. Attendance is one row per booking per library-local day; a second scan the
// same day sets check_out_at (never a new row — the unique key (subscription_id,
// local_date) is the DB guard).

const toAttendance = (row) =>
  row && {
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    memberCode: row.member_code,
    subscriptionId: row.subscription_id,
    slotName: row.slot_name,
    seatLabel: row.seat_label ?? null,
    localDate: row.local_date,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    method: row.method,
    outsideSlot: Boolean(row.outside_slot),
    hadDues: Boolean(row.had_dues),
  };

const SELECT_ATTENDANCE = `
  SELECT a.*, m.name AS member_name, m.member_code, sl.name AS slot_name, st.label AS seat_label
    FROM attendance a
    JOIN members m ON m.id = a.member_id
    JOIN subscriptions s ON s.id = a.subscription_id
    JOIN slots sl ON sl.id = s.slot_id
    LEFT JOIN seat_allocations al ON al.active_subscription_id = s.id
    LEFT JOIN seats st ON st.id = al.seat_id`;

/** The row for one booking on one day (to decide check-in vs. check-out). */
export async function findForDay(db, tenantId, subscriptionId, localDate) {
  return toAttendance(
    await queryOne(
      db,
      `${SELECT_ATTENDANCE} WHERE a.tenant_id = ? AND a.subscription_id = ? AND a.local_date = ?`,
      [tenantId, subscriptionId, localDate],
    ),
  );
}

export async function insertAttendance(db, tenantId, a) {
  await execute(
    db,
    `INSERT INTO attendance
       (id, tenant_id, member_id, subscription_id, local_date, check_in_at, method, outside_slot, had_dues, recorded_by)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?, ?)`,
    [
      a.id,
      tenantId,
      a.memberId,
      a.subscriptionId,
      a.localDate,
      a.method,
      a.outsideSlot ? 1 : 0,
      a.hadDues ? 1 : 0,
      a.recordedBy,
    ],
  );
}

export async function markCheckOut(db, tenantId, id) {
  await execute(
    db,
    "UPDATE attendance SET check_out_at = UTC_TIMESTAMP() WHERE tenant_id = ? AND id = ? AND check_out_at IS NULL",
    [tenantId, id],
  );
}

export async function findById(db, tenantId, id) {
  return toAttendance(
    await queryOne(db, `${SELECT_ATTENDANCE} WHERE a.tenant_id = ? AND a.id = ?`, [tenantId, id]),
  );
}

/** Everyone present on a day, optionally one slot — the attendance screen and its CSV. */
export async function listForDay(db, tenantId, localDate, slotId = null) {
  const where = slotId ? "AND s.slot_id = ?" : "";
  const params = slotId ? [tenantId, localDate, slotId] : [tenantId, localDate];
  const rows = await queryAll(
    db,
    `${SELECT_ATTENDANCE} WHERE a.tenant_id = ? AND a.local_date = ? ${where}
      ORDER BY a.check_in_at`,
    params,
  );
  return rows.map(toAttendance);
}

/** A member's attendance between two dates (inclusive) — the member page calendar. */
export async function listForMemberRange(db, tenantId, memberId, from, to) {
  const rows = await queryAll(
    db,
    `${SELECT_ATTENDANCE} WHERE a.tenant_id = ? AND a.member_id = ? AND a.local_date BETWEEN ? AND ?
      ORDER BY a.local_date DESC, a.check_in_at DESC`,
    [tenantId, memberId, from, to],
  );
  return rows.map(toAttendance);
}

/** How many distinct members were present on a day (desk screen counter). */
export async function countPresentOnDay(db, tenantId, localDate) {
  const row = await queryOne(
    db,
    "SELECT COUNT(DISTINCT member_id) AS present FROM attendance WHERE tenant_id = ? AND local_date = ?",
    [tenantId, localDate],
  );
  return Number(row?.present ?? 0);
}

/** Bookings explicitly marked absent on a day (the roster's override list). */
export async function listAbsentSubscriptionIds(db, tenantId, localDate) {
  const rows = await queryAll(
    db,
    "SELECT subscription_id FROM attendance_absences WHERE tenant_id = ? AND local_date = ?",
    [tenantId, localDate],
  );
  return new Set(rows.map((r) => r.subscription_id));
}

/** Staff marks a booking absent for a day — wins over any check-in without deleting it. */
export async function markAbsent(db, tenantId, a) {
  await execute(
    db,
    `INSERT INTO attendance_absences (id, tenant_id, subscription_id, local_date, marked_by, marked_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE marked_by = VALUES(marked_by), marked_at = UTC_TIMESTAMP()`,
    [a.id, tenantId, a.subscriptionId, a.localDate, a.markedBy],
  );
}

/** Clear an absent override (e.g. staff marks the booking present after all). */
export async function clearAbsence(db, tenantId, subscriptionId, localDate) {
  await execute(
    db,
    "DELETE FROM attendance_absences WHERE tenant_id = ? AND subscription_id = ? AND local_date = ?",
    [tenantId, subscriptionId, localDate],
  );
}
