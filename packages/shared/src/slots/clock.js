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

/** Day buckets for the attendance roster filter — coarser than slots, so admins don't
 * have to know which named slot "now" falls into. */
export const DAY_PERIODS = [
  { value: "morning", label: "Morning", fromMin: 0, toMin: 12 * 60 },
  { value: "afternoon", label: "Afternoon", fromMin: 12 * 60, toMin: 16 * 60 },
  { value: "evening", label: "Evening", fromMin: 16 * 60, toMin: 19 * 60 },
  { value: "night", label: "Night", fromMin: 19 * 60, toMin: MINUTES_PER_DAY },
];

/** Which bucket a clock-minute (slot start, or "now") falls into. */
export function periodOfMinutes(minutes) {
  const value = ((Number(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return (
    DAY_PERIODS.find((p) => value >= p.fromMin && value < p.toMin)?.value ?? DAY_PERIODS[0].value
  );
}
