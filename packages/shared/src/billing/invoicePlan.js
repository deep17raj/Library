import { addDaysToDateKey, displayDate } from "../time/zonedDate.js";
import { hasShortFirstPeriod, periodStart } from "./periods.js";

// Which invoices a subscription should have by `today`. Pure: the server inserts the
// ones that don't exist yet (each has a dedupe key, so running this again is harmless).

/**
 * @typedef {Object} SubscriptionTerms
 * @property {string} id
 * @property {string} slotName
 * @property {number} pricePaise        per period, surcharge included
 * @property {number} lockerFeePaise    per period
 * @property {"month" | "day"} periodUnit
 * @property {number} periodCount
 * @property {"advance" | "arrears"} collection
 * @property {string} billsFrom
 * @property {string | null} endOn      set once the subscription has ended
 */

/** Days between two date keys (end exclusive). */
export function daysBetween(start, end) {
  const toUtc = (key) =>
    Date.UTC(...key.split("-").map((part, i) => Number(part) - (i === 1 ? 1 : 0)));
  return Math.round((toUtc(end) - toUtc(start)) / 86_400_000);
}

function daysInMonthOf(dateKey) {
  const [year, month] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Fee for the short first period under month-start billing (decision D5): the whole
 * fee ("full") or the share of the month actually used ("prorated", to the rupee).
 */
export function firstPeriodAmount(pricePaise, { start, end }, firstPeriodBilling) {
  if (firstPeriodBilling !== "prorated") return pricePaise;
  const share = (pricePaise * daysBetween(start, end)) / daysInMonthOf(start);
  return Math.round(share / 100) * 100;
}

/**
 * Billing periods to invoice: every period that has started by `today`, stopping at
 * the one containing `endOn` (a student who left still owes the period they used).
 * @param {SubscriptionTerms} sub
 * @param {{ anchor: "join_date" | "month_start" }} settings
 */
export function periodsToInvoice(sub, { anchor }, today) {
  const terms = {
    billsFrom: sub.billsFrom,
    periodUnit: sub.periodUnit,
    periodCount: sub.periodCount,
    anchor,
  };
  const last = sub.endOn && sub.endOn < today ? sub.endOn : today;
  if (last < sub.billsFrom) return [];
  const periods = [];
  for (let index = 0; periodStart(terms, index) <= last; index += 1) {
    periods.push({ index, start: periodStart(terms, index), end: periodStart(terms, index + 1) });
  }
  return periods;
}

/**
 * The invoices (seat fee + locker) a subscription should have by `today`.
 * @param {SubscriptionTerms} sub
 * @param {{ anchor: "join_date" | "month_start", firstPeriodBilling: "full" | "prorated" }} settings
 * @param {string} today
 */
export function plannedInvoices(sub, settings, today) {
  const terms = { billsFrom: sub.billsFrom, periodUnit: sub.periodUnit, anchor: settings.anchor };
  const shortFirst = hasShortFirstPeriod(terms);
  const invoices = [];
  for (const period of periodsToInvoice(sub, settings, today)) {
    const amountOf = (full) =>
      period.index === 0 && shortFirst
        ? firstPeriodAmount(full, period, settings.firstPeriodBilling)
        : full;
    const range = `${displayDate(period.start)} – ${displayDate(addDaysToDateKey(period.end, -1))}`;
    const common = {
      subscriptionId: sub.id,
      periodStart: period.start,
      periodEnd: period.end,
      dueOn: sub.collection === "arrears" ? period.end : period.start,
    };
    invoices.push({
      ...common,
      kind: "seat_fee",
      dedupeKey: `sub:${sub.id}:${period.start}`,
      description: `${sub.slotName} fee · ${range}`,
      amountPaise: amountOf(sub.pricePaise),
    });
    if (sub.lockerFeePaise > 0) {
      invoices.push({
        ...common,
        kind: "locker",
        dedupeKey: `locker:${sub.id}:${period.start}`,
        description: `Locker · ${range}`,
        amountPaise: amountOf(sub.lockerFeePaise),
      });
    }
  }
  return invoices.filter((invoice) => invoice.amountPaise > 0);
}
