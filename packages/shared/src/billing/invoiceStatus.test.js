import assert from "node:assert/strict";
import { test } from "node:test";
import { invoiceStatus } from "./invoiceStatus.js";

const TODAY = "2026-10-15";
const invoice = (over) => ({
  status: "open",
  balancePaise: 80000,
  paidPaise: 0,
  dueOn: TODAY,
  ...over,
});

test("void, paid, upcoming, part paid, due today and overdue read as expected", () => {
  assert.deepEqual(invoiceStatus(invoice({ status: "void" }), TODAY), {
    label: "Void",
    tone: "slate",
  });
  assert.equal(invoiceStatus(invoice({ balancePaise: 0, status: "paid" }), TODAY).label, "Paid");
  assert.equal(invoiceStatus(invoice({ dueOn: "2026-11-01" }), TODAY).label, "Upcoming");
  assert.equal(
    invoiceStatus(invoice({ paidPaise: 30000, balancePaise: 50000 }), TODAY).label,
    "Part paid",
  );
  assert.equal(invoiceStatus(invoice(), TODAY).label, "Due today");
  assert.deepEqual(invoiceStatus(invoice({ dueOn: "2026-10-01" }), TODAY), {
    label: "Overdue",
    tone: "red",
  });
});
