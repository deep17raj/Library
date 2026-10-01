import { test } from "node:test";
import assert from "node:assert/strict";
import { ageingBucket, invoiceBalance, planAllocation, summariseDues } from "./dues.js";
import { daysBetween, firstPeriodAmount, plannedInvoices } from "./invoicePlan.js";

const SUB = {
  id: "s1",
  slotName: "Morning",
  pricePaise: 80000,
  lockerFeePaise: 0,
  periodUnit: "month",
  periodCount: 1,
  collection: "advance",
  billsFrom: "2026-10-10",
  endOn: null,
};
const JOIN_DATE = { anchor: "join_date", firstPeriodBilling: "full" };

test("advance billing invoices every started period, due on its first day", () => {
  const invoices = plannedInvoices(SUB, JOIN_DATE, "2026-12-09");
  assert.deepEqual(
    invoices.map((i) => [i.periodStart, i.dueOn, i.amountPaise]),
    [
      ["2026-10-10", "2026-10-10", 80000],
      ["2026-11-10", "2026-11-10", 80000],
    ],
  );
  assert.equal(invoices[0].dedupeKey, "sub:s1:2026-10-10");
  assert.equal(invoices[0].description, "Morning fee · 10 Oct 2026 – 9 Nov 2026");
});

test("arrears billing is due when the period ends", () => {
  const [first] = plannedInvoices({ ...SUB, collection: "arrears" }, JOIN_DATE, "2026-10-20");
  assert.equal(first.dueOn, "2026-11-10");
});

test("month-start billing: first month full or prorated (D5)", () => {
  const monthStart = { anchor: "month_start", firstPeriodBilling: "prorated" };
  const [short, whole] = plannedInvoices(SUB, monthStart, "2026-11-05");
  assert.deepEqual([short.periodStart, short.periodEnd], ["2026-10-10", "2026-11-01"]);
  assert.equal(short.amountPaise, 56800, "22 of 31 days of ₹800, to the rupee");
  assert.equal(whole.amountPaise, 80000);
  const full = plannedInvoices(SUB, { ...monthStart, firstPeriodBilling: "full" }, "2026-10-20");
  assert.equal(full[0].amountPaise, 80000);
  assert.equal(
    firstPeriodAmount(80000, { start: "2026-10-01", end: "2026-11-01" }, "prorated"),
    80000,
  );
});

test("lockers are their own invoices; ended subscriptions stop invoicing", () => {
  const withLocker = plannedInvoices({ ...SUB, lockerFeePaise: 10000 }, JOIN_DATE, "2026-10-10");
  assert.deepEqual(
    withLocker.map((i) => [i.kind, i.amountPaise]),
    [
      ["seat_fee", 80000],
      ["locker", 10000],
    ],
  );
  const ended = plannedInvoices({ ...SUB, endOn: "2026-10-25" }, JOIN_DATE, "2027-03-01");
  assert.equal(ended.length, 1, "only the period they used");
  assert.deepEqual(
    plannedInvoices({ ...SUB, billsFrom: "2026-11-10" }, JOIN_DATE, "2026-10-20"),
    [],
  );
});

const invoice = (id, dueOn, amountPaise, paidPaise = 0, extra = {}) => ({
  id,
  dueOn,
  amountPaise,
  paidPaise,
  discountPaise: 0,
  status: "open",
  ...extra,
});

test("dues: owed now vs coming, days late", () => {
  const invoices = [
    invoice("oct", "2026-10-10", 80000, 30000),
    invoice("nov", "2026-11-10", 80000),
    invoice("dep", "2026-10-10", 50000, 50000, { status: "paid" }),
    invoice("void", "2026-10-01", 9999, 0, { status: "void" }),
  ];
  assert.deepEqual(summariseDues(invoices, "2026-10-25"), {
    outstandingPaise: 50000,
    upcomingPaise: 80000,
    overdueSince: "2026-10-10",
    daysOverdue: 15,
    nextDueOn: "2026-11-10",
    nextDueAmountPaise: 80000,
  });
  assert.equal(invoiceBalance(invoice("d", "2026-10-10", 1000, 0, { discountPaise: 400 })), 600);
  assert.deepEqual([3, 8, 31].map(ageingBucket), ["0-7", "8-30", "30+"]);
  assert.equal(daysBetween("2026-02-27", "2026-03-01"), 2);
});

test("payments clear the oldest dues first, picked invoices before that, rest is credit", () => {
  const open = [invoice("nov", "2026-11-10", 80000), invoice("oct", "2026-10-10", 80000, 30000)];
  assert.deepEqual(planAllocation(open, 100000), {
    allocations: [
      { invoiceId: "oct", amountPaise: 50000 },
      { invoiceId: "nov", amountPaise: 50000 },
    ],
    leftoverPaise: 0,
  });
  assert.deepEqual(
    planAllocation(open, 200000, ["nov"]).allocations.map((a) => a.invoiceId),
    ["nov", "oct"],
  );
  assert.equal(planAllocation(open, 200000).leftoverPaise, 70000, "advance becomes credit");
});

test("same-day dues: fees first, deposit last", () => {
  const sameDay = [
    invoice("dep", "2026-10-10", 100000, 0, { kind: "deposit" }),
    invoice("fee", "2026-10-10", 80000, 0, { kind: "seat_fee" }),
    invoice("adm", "2026-10-10", 50000, 0, { kind: "admission" }),
  ];
  assert.deepEqual(
    planAllocation(sameDay, 140000).allocations.map((a) => [a.invoiceId, a.amountPaise]),
    [
      ["adm", 50000],
      ["fee", 80000],
      ["dep", 10000],
    ],
  );
});
