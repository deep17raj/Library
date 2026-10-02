// Business dates ("today", a billing period, an attendance day) belong to the
// LIBRARY's timezone, not the server's. A server in UTC would otherwise flip to
// tomorrow at 05:30 IST. Every "what day is it" question goes through here.

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

const formatterCache = new Map();

function partsFormatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    );
  }
  return formatterCache.get(timeZone);
}

function zonedParts(instant, timeZone) {
  const parts = {};
  for (const { type, value } of partsFormatter(timeZone).formatToParts(instant)) {
    parts[type] = value;
  }
  return parts;
}

/** @param {string} timeZone */
export function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return typeof timeZone === "string" && timeZone.length > 0;
  } catch {
    return false;
  }
}

/**
 * The calendar date ("YYYY-MM-DD") an instant falls on in a timezone.
 * @param {Date} instant
 * @param {string} timeZone
 */
export function localDateOf(instant, timeZone = DEFAULT_TIMEZONE) {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${month}-${day}`;
}

/**
 * Minutes after local midnight (0..1439) — the unit slot times are stored in.
 * @param {Date} instant
 * @param {string} timeZone
 */
export function localMinutesOf(instant, timeZone = DEFAULT_TIMEZONE) {
  const { hour, minute } = zonedParts(instant, timeZone);
  return Number(hour) * 60 + Number(minute);
}

/** @param {string} dateKey "YYYY-MM-DD" */
export function isDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) return false;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Calendar arithmetic on a date key, free of timezone/DST effects. */
export function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const displayFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10-01" → "1 Oct 2026" */
export function displayDate(dateKey) {
  if (!isDateKey(dateKey)) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  return displayFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

const dateTimeFormatters = new Map();

/**
 * An instant (Date or ISO string from the API) as "1 Oct 2026, 9:30 am" in a
 * timezone — the library's, or the viewer's when omitted. "Never" for empty values.
 * @param {Date | string | null | undefined} instant
 * @param {string} [timeZone]
 */
export function displayDateTime(instant, timeZone) {
  if (!instant) return "Never";
  const key = timeZone || "viewer";
  if (!dateTimeFormatters.has(key)) {
    dateTimeFormatters.set(
      key,
      new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone }),
    );
  }
  return dateTimeFormatters.get(key).format(new Date(instant));
}

const timeFormatters = new Map();

/**
 * Just the clock time of an instant, "9:05 am", in a timezone (the library's). "" for
 * empty values — for check-in/out times within a day.
 * @param {Date | string | null | undefined} instant
 * @param {string} [timeZone]
 */
export function displayTime(instant, timeZone) {
  if (!instant) return "";
  const key = timeZone || "viewer";
  if (!timeFormatters.has(key)) {
    timeFormatters.set(key, new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone }));
  }
  return timeFormatters.get(key).format(new Date(instant));
}

/** First and last day of the month a date falls in: "2026-10-15" → ["2026-10-01", "2026-10-31"]. */
export function monthRange(dateKey) {
  const [year, month] = dateKey.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = dateKey.slice(0, 7);
  return [`${prefix}-01`, `${prefix}-${String(last).padStart(2, "0")}`];
}

/** "2026-10" → "October 2026" */
export function displayMonth(dateKey) {
  const [year, month] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
