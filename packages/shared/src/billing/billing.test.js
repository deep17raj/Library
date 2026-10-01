import { test } from "node:test";
import assert from "node:assert/strict";
import { subscriptionPrice, surchargeForPeriod } from "./pricing.js";
import {
  addMonthsToDateKey,
  hasShortFirstPeriod,
  nextPeriodStart,
  periodContaining,
  periodStart,
} from "./periods.js";

const MONTHLY = { periodUnit: "month", periodCount: 1 };

test("price = plan + category surcharge for the whole period", () => {
  assert.deepEqual(subscriptionPrice({ pricePaise: 80000, ...MONTHLY }, 30000), {
    pricePaise: 110000,
    surchargePaise: 30000,
  });
  const quarterly = { pricePaise: 220000, periodUnit: "month", periodCount: 3 };
  assert.equal(subscriptionPrice(quarterly, 30000).pricePaise, 310000);
  assert.equal(surchargeForPeriod(30000, { periodUnit: "day", periodCount: 15 }), 15000);
  assert.equal(
    subscriptionPrice({ pricePaise: 5000, periodUnit: "day", periodCount: 1 }, 0).surchargePaise,
    0,
  );
});

test("adding months clamps to the month's last day without drifting", () => {
  assert.equal(addMonthsToDateKey("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsToDateKey("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonthsToDateKey("2026-11-15", 3), "2027-02-15");
  const terms = { billsFrom: "2026-01-31", ...MONTHLY, anchor: "join_date" };
  assert.deepEqual(
    [1, 2, 3].map((i) => periodStart(terms, i)),
    ["2026-02-28", "2026-03-31", "2026-04-30"],
  );
});

test("join-date billing: periods run from the joining day", () => {
  const terms = { billsFrom: "2026-10-10", ...MONTHLY, anchor: "join_date" };
  assert.deepEqual(periodContaining(terms, "2026-11-09"), {
    index: 0,
    start: "2026-10-10",
    end: "2026-11-10",
  });
  assert.deepEqual(periodContaining(terms, "2026-11-10"), {
    index: 1,
    start: "2026-11-10",
    end: "2026-12-10",
  });
  assert.equal(periodContaining(terms, "2026-10-09"), null, "before billing starts");
  assert.equal(nextPeriodStart(terms, "2026-10-20"), "2026-11-10");
  assert.equal(nextPeriodStart(terms, "2026-10-01"), "2026-10-10", "not started yet → its start");
});

test("month-start billing: short first period, then calendar months", () => {
  const terms = { billsFrom: "2026-10-10", ...MONTHLY, anchor: "month_start" };
  assert.equal(hasShortFirstPeriod(terms), true);
  assert.deepEqual(periodContaining(terms, "2026-10-31"), {
    index: 0,
    start: "2026-10-10",
    end: "2026-11-01",
  });
  assert.deepEqual(periodContaining(terms, "2026-11-15"), {
    index: 1,
    start: "2026-11-01",
    end: "2026-12-01",
  });
  assert.equal(hasShortFirstPeriod({ ...terms, billsFrom: "2026-10-01" }), false);
  assert.equal(
    hasShortFirstPeriod({ ...terms, periodUnit: "day" }),
    false,
    "day plans ignore the anchor",
  );
});

test("day plans step by days", () => {
  const terms = {
    billsFrom: "2026-10-30",
    periodUnit: "day",
    periodCount: 15,
    anchor: "month_start",
  };
  assert.equal(nextPeriodStart(terms, "2026-11-05"), "2026-11-14");
});
