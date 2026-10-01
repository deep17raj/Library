import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDaysToDateKey,
  displayDate,
  displayDateTime,
  isDateKey,
  isValidTimeZone,
  localDateOf,
  localMinutesOf,
} from "./zonedDate.js";

test("localDateOf uses the library timezone, not the server's", () => {
  // 2026-09-30T20:00Z is already 1 Oct, 01:30 in India.
  const instant = new Date("2026-09-30T20:00:00Z");
  assert.equal(localDateOf(instant, "Asia/Kolkata"), "2026-10-01");
  assert.equal(localDateOf(instant, "UTC"), "2026-09-30");
  assert.equal(localMinutesOf(instant, "Asia/Kolkata"), 90);
});

test("isValidTimeZone", () => {
  assert.equal(isValidTimeZone("Asia/Kolkata"), true);
  assert.equal(isValidTimeZone("Mars/Base"), false);
  assert.equal(isValidTimeZone(""), false);
});

test("date key helpers", () => {
  assert.equal(isDateKey("2026-02-29"), false);
  assert.equal(isDateKey("2028-02-29"), true);
  assert.equal(addDaysToDateKey("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysToDateKey("2026-03-01", -1), "2026-02-28");
  assert.equal(displayDate("2026-10-01"), "1 Oct 2026");
});

test("displayDateTime shows an instant in the given timezone", () => {
  assert.equal(displayDateTime(null), "Never");
  assert.match(displayDateTime("2026-09-30T20:00:00Z", "Asia/Kolkata"), /1 Oct 2026/);
});

test("month helpers", async () => {
  const { monthRange, displayMonth } = await import("./zonedDate.js");
  assert.deepEqual(monthRange("2028-02-10"), ["2028-02-01", "2028-02-29"]);
  assert.equal(displayMonth("2026-10-15"), "October 2026");
});
