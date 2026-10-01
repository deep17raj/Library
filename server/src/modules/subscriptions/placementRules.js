import { ERROR_CODES } from "@app/shared/constants";
import { displaySlotTimes, peakDuringSlot, slotsOverlap } from "@app/shared/slots";
import { conflict } from "../../http/AppError.js";

// The seating rules as pure functions over plain data, so they are unit-tested
// without a database. placement.js loads the data (under row locks) and calls these.

/** @typedef {{ startMin: number, endMin: number }} SlotTimes */

/**
 * Allocations on one seat whose slot overlaps `slot`.
 * @param {(SlotTimes & { memberName: string, slotName: string })[]} allocationsOnSeat
 * @param {SlotTimes} slot
 */
export function seatConflicts(allocationsOnSeat, slot) {
  return allocationsOnSeat.filter((allocation) => slotsOverlap(allocation, slot));
}

/**
 * A member's own active slots that overlap `slot` — nobody sits in two places at once.
 * @param {(SlotTimes & { subscriptionId: string, slotName: string })[]} memberSlots
 * @param {SlotTimes} slot
 */
export function memberOverlaps(memberSlots, slot) {
  return memberSlots.filter((held) => slotsOverlap(held, slot));
}

/**
 * Can a sit-anywhere hall take one more student in `slot`? At every moment of the
 * slot, the students already there must leave at least one seat free.
 * @param {SlotTimes[]} hallSlots active subscriptions in the hall
 * @param {SlotTimes} slot
 * @param {number} capacity active seats in the hall
 */
export function hallHasRoom(hallSlots, slot, capacity) {
  return peakDuringSlot(hallSlots, slot) < capacity;
}

// ── The errors people see ──────────────────────────────────────────────
const describe = (held) => `${held.slotName}, ${displaySlotTimes(held)}`;

export function seatTakenError(seatLabel, conflicts) {
  const who = conflicts.map((c) => `${c.memberName} (${describe(c)})`).join(", ");
  const message = `Seat ${seatLabel} is taken at this time by ${who}`;
  return conflict(ERROR_CODES.SEAT_SLOT_TAKEN, message, { seatId: message });
}

/** When only the database's unique key noticed (a race), we can't name who. */
export function seatTakenByRaceError(seatLabel) {
  const message = `Seat ${seatLabel} was just taken for this time. Pick another seat.`;
  return conflict(ERROR_CODES.SEAT_SLOT_TAKEN, message, { seatId: message });
}

export function memberOverlapError(overlaps) {
  const message = `This student already has ${overlaps.map(describe).join(" and ")}, which overlaps this slot`;
  return conflict(ERROR_CODES.MEMBER_SLOT_OVERLAP, message, { slotId: message });
}

export function hallFullError(hallName, capacity) {
  const message = `${hallName} is full at this time (${capacity} of ${capacity} places taken)`;
  return conflict(ERROR_CODES.HALL_SLOT_FULL, message, { hallId: message });
}
