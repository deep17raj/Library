import { monthRange } from "./zonedDate.js";

/** Short weekday headers for a Sunday-first calendar (the usual Indian wall calendar). */
export const WEEKDAY_LABELS = Object.freeze(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

/**
 * The weeks of the month a date falls in, Sunday first. Days outside the month are
 * `null`, so the grid always has full 7-day rows. Pure date-key maths (no timezone).
 * @param {string} dateKey any day of the month, "YYYY-MM-DD"
 * @returns {(string | null)[][]}
 */
export function monthGrid(dateKey) {
  const [first, last] = monthRange(dateKey);
  const [year, month] = first.split("-").map(Number);
  const leadingBlanks = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = Number(last.slice(8));
  const cells = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${first.slice(0, 8)}${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "2026-10-15" → "2026-11-01" (first day of the next month); negative steps go back. */
export function shiftMonth(dateKey, months) {
  const [year, month] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return shifted.toISOString().slice(0, 10);
}
