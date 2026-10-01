// Time slots are clock ranges in minutes after local midnight. To compare them we
// split the day into 48 cells of 30 minutes: a slot "holds" the cells it covers.
// Two slots overlap exactly when they share a cell. The same cells are written to
// seat_allocation_cells, where a unique key makes MySQL refuse overlaps too.

export const CELL_MINUTES = 30;
export const CELLS_PER_DAY = (24 * 60) / CELL_MINUTES;
export const MINUTES_PER_DAY = 24 * 60;

/** @typedef {{ startMin: number, endMin: number }} SlotTimes */

/** Valid slot times: on a 30-minute boundary, within the day, start ≠ end. */
export function isValidSlotTimes({ startMin, endMin }) {
  const onGrid = (minute) =>
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute < MINUTES_PER_DAY &&
    minute % CELL_MINUTES === 0;
  return onGrid(startMin) && onGrid(endMin) && startMin !== endMin;
}

/**
 * Cell numbers a slot covers, in order. A slot whose end is before its start runs
 * past midnight: 22:00–06:00 covers 44…47 and 0…11.
 * @param {SlotTimes} slot
 * @returns {number[]}
 */
export function cellsForSlot({ startMin, endMin }) {
  const first = startMin / CELL_MINUTES;
  const count =
    ((((endMin - startMin) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY) / CELL_MINUTES;
  return Array.from({ length: count }, (_, index) => (first + index) % CELLS_PER_DAY);
}

/** @param {SlotTimes} a @param {SlotTimes} b */
export function slotsOverlap(a, b) {
  const cells = new Set(cellsForSlot(a));
  return cellsForSlot(b).some((cell) => cells.has(cell));
}

/** Length in minutes (overnight slots included). @param {SlotTimes} slot */
export function slotDurationMinutes(slot) {
  return cellsForSlot(slot).length * CELL_MINUTES;
}

/**
 * Is a time of day inside the slot, allowing people in `earlyMinutes` before it starts?
 * Used by check-in (milestone 6).
 * @param {number} minuteOfDay 0…1439
 * @param {SlotTimes} slot
 * @param {number} [earlyMinutes]
 */
export function isWithinSlot(minuteOfDay, { startMin, endMin }, earlyMinutes = 0) {
  const sinceStart = (minuteOfDay - startMin + earlyMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const length = (endMin - startMin + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return sinceStart < length + earlyMinutes;
}

/**
 * For "sit anywhere" halls: how many of these slots are running in each cell.
 * @param {SlotTimes[]} slots one entry per active subscription
 * @returns {number[]} 48 counts
 */
export function occupancyByCell(slots) {
  const counts = new Array(CELLS_PER_DAY).fill(0);
  for (const slot of slots) for (const cell of cellsForSlot(slot)) counts[cell] += 1;
  return counts;
}

/** Busiest moment: the most slots running at once. */
export function peakOccupancy(slots) {
  return Math.max(0, ...occupancyByCell(slots));
}

/**
 * Busiest moment *during* `slot` — what limits one more "sit anywhere" place in it.
 * @param {SlotTimes[]} existing
 * @param {SlotTimes} slot
 */
export function peakDuringSlot(existing, slot) {
  const counts = occupancyByCell(existing);
  return Math.max(0, ...cellsForSlot(slot).map((cell) => counts[cell]));
}
