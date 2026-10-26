import { test } from "node:test";
import assert from "node:assert/strict";
import { hasOutstandingDue, paymentReminderMessage } from "./paymentReminder.js";

const base = {
  phone: "9876543210",
  memberName: "Asha Rao",
  libraryName: "Focus Study Hall",
  summary: { outstandingPaise: 50000, daysOverdue: 0, nextDueOn: "2026-11-10" },
};

test("hasOutstandingDue is true only when a balance is owed", () => {
  assert.equal(hasOutstandingDue({ outstandingPaise: 1 }), true);
  assert.equal(hasOutstandingDue({ outstandingPaise: 0 }), false);
  assert.equal(hasOutstandingDue(null), false);
});

test("no reminder when nothing is owed", () => {
  assert.equal(paymentReminderMessage({ ...base, summary: { outstandingPaise: 0 } }), null);
});

test("no reminder when the phone is not a reachable mobile", () => {
  assert.equal(paymentReminderMessage({ ...base, phone: "" }), null);
  assert.equal(paymentReminderMessage({ ...base, phone: "12345" }), null);
});

test("builds a wa.me link with the country code and the amount owed", () => {
  const reminder = paymentReminderMessage(base);
  assert.ok(reminder.url.startsWith("https://wa.me/919876543210?text="));
  assert.match(reminder.text, /₹500/);
  assert.match(reminder.text, /Focus Study Hall/);
  assert.match(reminder.text, /due on 10 Nov 2026/);
  assert.equal(
    reminder.url,
    `https://wa.me/919876543210?text=${encodeURIComponent(reminder.text)}`,
  );
});

test("overdue dues are described by how late they are", () => {
  const reminder = paymentReminderMessage({
    ...base,
    summary: { outstandingPaise: 50000, daysOverdue: 1, nextDueOn: "2026-10-01" },
  });
  assert.match(reminder.text, /overdue by 1 day\b/);
});
