import { isWithinSlot, MINUTES_PER_DAY } from "../slots/slotCells.js";

/**
 * @typedef {object} CheckinBooking
 * @property {string} subscriptionId
 * @property {string} slotName
 * @property {number} startMin  minutes after local midnight
 * @property {number} endMin
 */

/**
 * How far `nowMin` is from a slot, in minutes (0 while inside it). Used to pick the
 * most relevant booking when a student checks in outside every slot.
 * @param {number} nowMin
 * @param {CheckinBooking} slot
 */
export function minutesFromSlot(nowMin, slot) {
  if (isWithinSlot(nowMin, slot)) return 0;
  const beforeStart = (slot.startMin - nowMin + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const afterEnd = (nowMin - slot.endMin + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return Math.min(beforeStart, afterEnd);
}

/**
 * Decide which booking a check-in belongs to and whether the time of day is allowed.
 * Pure (library timezone handled by the caller): the server passes the member's active
 * bookings, the current minute of the local day and the library's slot rule.
 *
 * - `decision: "none"`  — the member has no active booking; the server refuses.
 * - `decision: "block"` — outside every slot and the rule is `block`; the server refuses
 *   and names `booking`'s times.
 * - `decision: "record"` — record it; `outsideSlot` is true when it was outside the slot
 *   (always false under `block`, true/false under `warn`, ignored-but-recorded under `off`).
 *
 * @param {{ nowMin: number, bookings: CheckinBooking[],
 *   mode?: "off"|"warn"|"block", earlyMinutes?: number }} input
 */
export function evaluateCheckin({ nowMin, bookings, mode = "warn", earlyMinutes = 0 }) {
  if (!bookings || bookings.length === 0) {
    return { decision: "none", booking: null, outsideSlot: false };
  }
  const inSlot = bookings.find((b) => isWithinSlot(nowMin, b, earlyMinutes));
  if (inSlot) return { decision: "record", booking: inSlot, outsideSlot: false };

  // Outside every slot: act on the nearest one so the message/record make sense.
  const nearest = bookings.reduce((best, b) =>
    minutesFromSlot(nowMin, b) < minutesFromSlot(nowMin, best) ? b : best,
  );
  if (mode === "block") return { decision: "block", booking: nearest, outsideSlot: true };
  return { decision: "record", booking: nearest, outsideSlot: true };
}
