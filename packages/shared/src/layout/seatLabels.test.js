import { test } from "node:test";
import assert from "node:assert/strict";
import { duplicateLabels, nextSeatNumber, planTablesWithSeats } from "./seatLabels.js";

test("planTablesWithSeats numbers seats continuously across tables", () => {
  const plan = planTablesWithSeats({
    existingTableCount: 2,
    tableCount: 2,
    seatsPerTable: 3,
    seatPrefix: "A-",
    startNumber: 13,
  });
  assert.deepEqual(plan, [
    { label: "Table 3", seatLabels: ["A-13", "A-14", "A-15"] },
    { label: "Table 4", seatLabels: ["A-16", "A-17", "A-18"] },
  ]);
});

test("nextSeatNumber continues after the highest numbered label with that prefix", () => {
  assert.equal(nextSeatNumber(["A-1", "A-12", "A-3", "B-40", "A-x"], "A-"), 13);
  assert.equal(nextSeatNumber([], "A-"), 1);
});

test("duplicateLabels ignores case", () => {
  assert.deepEqual(duplicateLabels(["A-1", "a-1", "A-2"]), ["a-1"]);
});
