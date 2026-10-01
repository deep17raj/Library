import { execute, queryAll, queryOne } from "../../db/transaction.js";

// SQL for `subscriptions`. A subscription = one member + one slot + price terms +
// where they sit (hall; the seat itself is in seat_allocations).

const SELECT_SUBSCRIPTION = `
  SELECT s.*, sl.name AS slot_name, sl.start_min, sl.end_min, p.name AS plan_name,
         h.name AS hall_name, h.seating_mode, a.id AS allocation_id, a.seat_id, st.label AS seat_label
    FROM subscriptions s
    JOIN slots sl ON sl.id = s.slot_id
    JOIN plans p ON p.id = s.plan_id
    JOIN halls h ON h.id = s.hall_id
    LEFT JOIN seat_allocations a ON a.active_subscription_id = s.id
    LEFT JOIN seats st ON st.id = a.seat_id`;

function toSubscription(row) {
  if (!row) return null;
  return {
    id: row.id,
    memberId: row.member_id,
    slot: { id: row.slot_id, name: row.slot_name, startMin: row.start_min, endMin: row.end_min },
    plan: { id: row.plan_id, name: row.plan_name },
    hall: { id: row.hall_id, name: row.hall_name, seatingMode: row.seating_mode },
    seat: row.seat_id
      ? { id: row.seat_id, label: row.seat_label, allocationId: row.allocation_id }
      : null,
    pricePaise: row.price_paise,
    surchargePaise: row.surcharge_paise,
    periodUnit: row.period_unit,
    periodCount: row.period_count,
    lockerFeePaise: row.locker_fee_paise,
    collection: row.collection,
    startOn: row.start_on,
    billsFrom: row.bills_from,
    endOn: row.end_on,
    status: row.status,
    endReason: row.end_reason,
    previousSubscriptionId: row.previous_subscription_id,
  };
}

export async function findSubscription(db, tenantId, id) {
  return toSubscription(
    await queryOne(db, `${SELECT_SUBSCRIPTION} WHERE s.tenant_id = ? AND s.id = ?`, [tenantId, id]),
  );
}

export async function listMemberSubscriptions(db, tenantId, memberId) {
  const rows = await queryAll(
    db,
    `${SELECT_SUBSCRIPTION} WHERE s.tenant_id = ? AND s.member_id = ?
      ORDER BY s.status = 'active' DESC, s.start_on DESC, s.created_at DESC`,
    [tenantId, memberId],
  );
  return rows.map(toSubscription);
}

/** Slot times of a member's active subscriptions — "can't sit in two places at once". */
export async function listActiveSlotsOfMember(db, tenantId, memberId) {
  return queryAll(
    db,
    `SELECT s.id AS subscriptionId, sl.name AS slotName, sl.start_min AS startMin, sl.end_min AS endMin
       FROM subscriptions s JOIN slots sl ON sl.id = s.slot_id
      WHERE s.tenant_id = ? AND s.member_id = ? AND s.status = 'active'`,
    [tenantId, memberId],
  );
}

/** Slot times of everyone active in a hall — capacity of a sit-anywhere hall. */
export async function listActiveSlotsInHall(db, tenantId, hallId) {
  return queryAll(
    db,
    `SELECT s.id AS subscriptionId, s.member_id AS memberId, sl.start_min AS startMin, sl.end_min AS endMin
       FROM subscriptions s JOIN slots sl ON sl.id = s.slot_id
      WHERE s.tenant_id = ? AND s.hall_id = ? AND s.status = 'active'`,
    [tenantId, hallId],
  );
}

/** Everyone holding a slot, with where they sit — used when the slot's times change. */
export async function listActiveSubscriptionsOfSlot(db, tenantId, slotId) {
  return queryAll(
    db,
    `SELECT s.id AS subscriptionId, s.member_id AS memberId, m.name AS memberName, s.hall_id AS hallId,
            h.seating_mode AS seatingMode, a.id AS allocationId, a.seat_id AS seatId, st.label AS seatLabel
       FROM subscriptions s
       JOIN members m ON m.id = s.member_id
       JOIN halls h ON h.id = s.hall_id
       LEFT JOIN seat_allocations a ON a.active_subscription_id = s.id
       LEFT JOIN seats st ON st.id = a.seat_id
      WHERE s.tenant_id = ? AND s.slot_id = ? AND s.status = 'active'`,
    [tenantId, slotId],
  );
}

/** Everyone with an active booking, optionally one slot — the attendance roster. */
export async function listActiveBookings(db, tenantId, slotId = null) {
  const where = slotId ? "AND s.slot_id = ?" : "";
  const params = slotId ? [tenantId, slotId] : [tenantId];
  return queryAll(
    db,
    `SELECT s.id AS subscriptionId, s.member_id AS memberId, m.name AS memberName,
            m.member_code AS memberCode, s.slot_id AS slotId, sl.name AS slotName,
            sl.start_min AS startMin, sl.end_min AS endMin, st.label AS seatLabel
       FROM subscriptions s
       JOIN members m ON m.id = s.member_id
       JOIN slots sl ON sl.id = s.slot_id
       LEFT JOIN seat_allocations al ON al.active_subscription_id = s.id
       LEFT JOIN seats st ON st.id = al.seat_id
      WHERE s.tenant_id = ? AND s.status = 'active' ${where}
      ORDER BY sl.start_min, m.name`,
    params,
  );
}

export async function countActiveSubscriptionsInHall(db, tenantId, hallId) {
  const row = await queryOne(
    db,
    "SELECT COUNT(*) AS total FROM subscriptions WHERE tenant_id = ? AND hall_id = ? AND status = 'active'",
    [tenantId, hallId],
  );
  return Number(row.total);
}

export async function insertSubscription(db, tenantId, sub) {
  await execute(
    db,
    `INSERT INTO subscriptions (id, tenant_id, member_id, slot_id, plan_id, hall_id, price_paise,
       surcharge_paise, period_unit, period_count, locker_fee_paise, collection, start_on, bills_from,
       previous_subscription_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sub.id,
      tenantId,
      sub.memberId,
      sub.slotId,
      sub.planId,
      sub.hallId,
      sub.pricePaise,
      sub.surchargePaise,
      sub.periodUnit,
      sub.periodCount,
      sub.lockerFeePaise,
      sub.collection,
      sub.startOn,
      sub.billsFrom,
      sub.previousSubscriptionId ?? null,
    ],
  );
}

export async function markSubscriptionEnded(db, tenantId, id, { endOn, reason }) {
  await execute(
    db,
    `UPDATE subscriptions SET status = 'ended', end_on = ?, end_reason = ?, ended_at = UTC_TIMESTAMP()
      WHERE tenant_id = ? AND id = ? AND status = 'active'`,
    [endOn, reason, tenantId, id],
  );
}

/** A move to another hall at the same price keeps the subscription. */
export async function setSubscriptionHall(db, tenantId, id, hallId) {
  await execute(db, "UPDATE subscriptions SET hall_id = ? WHERE tenant_id = ? AND id = ?", [
    hallId,
    tenantId,
    id,
  ]);
}

/** Students in a sit-anywhere hall, with their slots — the seat map's list for that hall. */
export async function listActiveOccupantsOfHall(db, tenantId, hallId) {
  return queryAll(
    db,
    `SELECT s.id AS subscriptionId, m.id AS memberId, m.name AS memberName, m.member_code AS memberCode,
            sl.id AS slotId, sl.name AS slotName, sl.start_min AS startMin, sl.end_min AS endMin
       FROM subscriptions s
       JOIN members m ON m.id = s.member_id
       JOIN slots sl ON sl.id = s.slot_id
      WHERE s.tenant_id = ? AND s.hall_id = ? AND s.status = 'active'
      ORDER BY sl.start_min, m.name`,
    [tenantId, hallId],
  );
}

/** Where each of these members sits now — one line per active subscription (members list). */
export async function listActivePlacementsOfMembers(db, tenantId, memberIds) {
  if (memberIds.length === 0) return [];
  return queryAll(
    db,
    `SELECT s.member_id AS memberId, s.id AS subscriptionId, sl.name AS slotName,
            sl.start_min AS startMin, h.name AS hallName, st.label AS seatLabel
       FROM subscriptions s
       JOIN slots sl ON sl.id = s.slot_id
       JOIN halls h ON h.id = s.hall_id
       LEFT JOIN seat_allocations a ON a.active_subscription_id = s.id
       LEFT JOIN seats st ON st.id = a.seat_id
      WHERE s.tenant_id = ? AND s.member_id IN (?) AND s.status = 'active'
      ORDER BY sl.start_min`,
    [tenantId, memberIds],
  );
}

export async function countActiveSubscriptionsOfMember(db, tenantId, memberId) {
  const row = await queryOne(
    db,
    "SELECT COUNT(*) AS total FROM subscriptions WHERE tenant_id = ? AND member_id = ? AND status = 'active'",
    [tenantId, memberId],
  );
  return Number(row.total);
}
