import { slotsOverlap } from "./slotCells.js";

/**
 * How a seat looks on the seat map for one slot:
 *  - "free":    nobody holds it at any time
 *  - "partial": held at other times, but free during this slot (bookable)
 *  - "taken":   someone holds it during this slot
 * With no slot chosen ("all day" view) a seat with anyone on it is "taken".
 * @param {{ startMin: number, endMin: number }[]} occupants
 * @param {{ startMin: number, endMin: number } | null} slot
 * @returns {"free" | "partial" | "taken"}
 */
export function seatStatusForSlot(occupants, slot) {
  if (occupants.length === 0) return "free";
  if (!slot) return "taken";
  return occupants.some((occupant) => slotsOverlap(occupant, slot)) ? "taken" : "partial";
}

/** The occupants who are actually in the seat during `slot`. */
export function occupantsDuringSlot(occupants, slot) {
  return slot ? occupants.filter((occupant) => slotsOverlap(occupant, slot)) : occupants;
}
