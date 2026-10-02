import assert from "node:assert/strict";
import { test } from "node:test";
import { monthGrid, shiftMonth } from "./calendar.js";

test("October 2026 starts on a Thursday and fills whole weeks", () => {
  const weeks = monthGrid("2026-10-15");
  assert.equal(weeks.length, 5);
  assert.deepEqual(weeks[0], [null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
  assert.equal(weeks.at(-1).includes("2026-10-31"), true);
  for (const week of weeks) assert.equal(week.length, 7);
});

test("February in a non-leap year has 28 days", () => {
  const days = monthGrid("2027-02-10").flat().filter(Boolean);
  assert.equal(days.length, 28);
  assert.equal(days.at(-1), "2027-02-28");
});

test("shiftMonth moves to the first of another month, across years", () => {
  assert.equal(shiftMonth("2026-10-15", 1), "2026-11-01");
  assert.equal(shiftMonth("2026-01-31", -1), "2025-12-01");
  assert.equal(shiftMonth("2026-12-05", 1), "2027-01-01");
});
