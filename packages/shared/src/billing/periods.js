import { addDaysToDateKey } from "../time/zonedDate.js";

// Billing periods of a subscription, on library-local calendar dates ("YYYY-MM-DD").
// Periods start at `billsFrom` and repeat every periodCount months/days.
// With billing_anchor = "month_start" a monthly subscription that starts mid-month
// gets a short first period up to the 1st, then whole calendar months.

/**
 * @typedef {Object} BillingTerms
 * @property {string} billsFrom          first day the subscription is billed for
 * @property {"month" | "day"} periodUnit
 * @property {number} periodCount
 * @property {"join_date" | "month_start"} anchor  library setting
 */

/** "2026-01-31" + 1 month → "2026-02-28": the day is clamped, never rolled into March. */
export function addMonthsToDateKey(dateKey, months) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

function firstOfNextMonth(dateKey) {
  return addMonthsToDateKey(`${dateKey.slice(0, 8)}01`, 1);
}

/** Does this subscription get a short first period (month_start anchoring, joined mid-month)? */
export function hasShortFirstPeriod({ billsFrom, periodUnit, anchor }) {
  return anchor === "month_start" && periodUnit === "month" && !billsFrom.endsWith("-01");
}

/**
 * Start date of period number `index` (0 = first). Always computed from the origin,
 * not by stepping, so month-end clamping never drifts (Jan 31 → Feb 28 → Mar 31).
 * @param {BillingTerms} terms
 * @param {number} index
 */
export function periodStart(terms, index) {
  const { billsFrom, periodUnit, periodCount } = terms;
  if (index === 0) return billsFrom;
  if (periodUnit === "day") return addDaysToDateKey(billsFrom, index * periodCount);
  if (hasShortFirstPeriod(terms)) {
    return addMonthsToDateKey(firstOfNextMonth(billsFrom), (index - 1) * periodCount);
  }
  return addMonthsToDateKey(billsFrom, index * periodCount);
}

/**
 * The period that contains `dateKey` (null before billing starts).
 * @param {BillingTerms} terms
 * @param {string} dateKey
 * @returns {{ index: number, start: string, end: string } | null} end is exclusive
 */
export function periodContaining(terms, dateKey) {
  if (dateKey < terms.billsFrom) return null;
  let index = 0;
  // Periods are at least a day long, so this ends; real subscriptions have few periods.
  while (periodStart(terms, index + 1) <= dateKey) index += 1;
  return { index, start: periodStart(terms, index), end: periodStart(terms, index + 1) };
}

/**
 * The first day of the next billing period after `dateKey` — when a mid-period
 * change (new slot, pricier seat) starts being billed (decision D4).
 * @param {BillingTerms} terms
 * @param {string} dateKey
 */
export function nextPeriodStart(terms, dateKey) {
  const current = periodContaining(terms, dateKey);
  return current ? current.end : terms.billsFrom;
}
