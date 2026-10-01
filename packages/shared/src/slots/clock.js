import { MINUTES_PER_DAY } from "./slotCells.js";

/** 390 → "06:30" (24-hour, what <input type="time"> uses). */
export function minutesToClock(minutes) {
  const value = ((Number(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = String(Math.floor(value / 60)).padStart(2, "0");
  const mins = String(value % 60).padStart(2, "0");
  return `${hours}:${mins}`;
}

/** "06:30" → 390; null when it isn't a valid 24-hour time. */
export function clockToMinutes(text) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(text || "").trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** 390 → "6:30 am": how people say times on screens and receipts. */
export function displayClock(minutes) {
  const [hours, mins] = minutesToClock(minutes).split(":").map(Number);
  const suffix = hours < 12 ? "am" : "pm";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(mins).padStart(2, "0")} ${suffix}`;
}

/** "6:00 am – 12:00 pm" */
export function displaySlotTimes({ startMin, endMin }) {
  return `${displayClock(startMin)} – ${displayClock(endMin)}`;
}
