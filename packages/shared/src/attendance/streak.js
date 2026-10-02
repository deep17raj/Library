import { addDaysToDateKey } from "../time/zonedDate.js";

/**
 * How many days in a row a student has come in, counting back from today. If they
 * haven't checked in yet today, the streak still counts up to yesterday (the day
 * isn't over), so it doesn't "break" every morning.
 * @param {Iterable<string>} presentDates library-local date keys with a check-in
 * @param {string} today library-local date key
 */
export function attendanceStreak(presentDates, today) {
  const present = new Set(presentDates);
  let day = present.has(today) ? today : addDaysToDateKey(today, -1);
  let streak = 0;
  while (present.has(day)) {
    streak += 1;
    day = addDaysToDateKey(day, -1);
  }
  return streak;
}
