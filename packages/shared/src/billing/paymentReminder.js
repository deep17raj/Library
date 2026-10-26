// A WhatsApp payment reminder for a member who owes fees. The message and the
// wa.me link are built here (not in the UI) so the "only when something is owed"
// rule and the Indian-number formatting stay in one tested place.
import { formatRupees } from "../money/index.js";
import { displayDate } from "../time/index.js";

/** True when this member has an unpaid balance a reminder can be sent about. */
export function hasOutstandingDue(summary) {
  return Boolean(summary) && summary.outstandingPaise > 0;
}

/**
 * Build the WhatsApp reminder for a member's dues, or `null` when nothing is
 * owed or the phone isn't a reachable 10-digit Indian mobile — the caller then
 * leaves the button non-clickable.
 * @param {{
 *   phone?: string,
 *   memberName: string,
 *   libraryName?: string,
 *   summary: { outstandingPaise: number, daysOverdue?: number, nextDueOn?: string | null },
 * }} params
 * @returns {{ url: string, text: string } | null}
 */
export function paymentReminderMessage({ phone, memberName, libraryName, summary }) {
  if (!hasOutstandingDue(summary)) return null;
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(digits)) return null;

  const from = libraryName ? ` from ${libraryName}` : "";
  const amount = formatRupees(summary.outstandingPaise);
  let when = "";
  if (summary.daysOverdue > 0) {
    when = `, overdue by ${summary.daysOverdue} day${summary.daysOverdue === 1 ? "" : "s"}`;
  } else if (summary.nextDueOn) {
    when = `, due on ${displayDate(summary.nextDueOn)}`;
  }

  const text =
    `Hello ${memberName}, a gentle reminder${from}: ` +
    `your pending fee is ${amount}${when}. ` +
    `Kindly pay at your earliest convenience. Thank you.`;

  return { url: `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`, text };
}
