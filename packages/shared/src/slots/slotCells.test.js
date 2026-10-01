import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cellsForSlot,
  isValidSlotTimes,
  isWithinSlot,
  peakDuringSlot,
  peakOccupancy,
  slotDurationMinutes,
  slotsOverlap,
} from "./slotCells.js";
import { clockToMinutes, displaySlotTimes, minutesToClock } from "./clock.js";

const at = (clock) => clockToMinutes(clock);
const slot = (start, end) => ({ startMin: at(start), endMin: at(end) });

const MORNING = slot("06:00", "12:00");
const EVENING = slot("12:00", "18:00");
const NIGHT = slot("18:00", "23:00");
const FULL_DAY = slot("06:00", "23:00");
const OVERNIGHT = slot("22:00", "06:00");

test("cellsForSlot covers start up to (not including) end", () => {
  assert.deepEqual(cellsForSlot(MORNING), [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
  assert.deepEqual(cellsForSlot(OVERNIGHT), [44, 45, 46, 47, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(slotDurationMinutes(FULL_DAY), 17 * 60);
});

test("adjacent slots share a seat; overlapping ones don't (the library rule)", () => {
  assert.equal(slotsOverlap(MORNING, EVENING), false, "Morning + Evening is valid");
  assert.equal(slotsOverlap(EVENING, NIGHT), false);
  assert.equal(slotsOverlap(MORNING, FULL_DAY), true, "Morning + Full Day is not");
  assert.equal(slotsOverlap(FULL_DAY, NIGHT), true, "nested slot");
  assert.equal(slotsOverlap(MORNING, MORNING), true, "identical slot");
});

test("overnight slots wrap past midnight", () => {
  assert.equal(slotsOverlap(OVERNIGHT, NIGHT), true, "22:00–23:00 is shared");
  assert.equal(slotsOverlap(OVERNIGHT, MORNING), false, "ends exactly when Morning starts");
  assert.equal(slotsOverlap(OVERNIGHT, slot("05:30", "07:00")), true);
});

test("isValidSlotTimes requires the 30-minute grid and a non-empty slot", () => {
  assert.equal(isValidSlotTimes(MORNING), true);
  assert.equal(isValidSlotTimes(OVERNIGHT), true);
  assert.equal(isValidSlotTimes(slot("06:15", "12:00")), false);
  assert.equal(isValidSlotTimes(slot("06:00", "06:00")), false);
  assert.equal(isValidSlotTimes({ startMin: 0, endMin: 1440 }), false);
});

test("isWithinSlot allows early arrival and handles overnight slots", () => {
  assert.equal(isWithinSlot(at("11:59"), MORNING), true);
  assert.equal(isWithinSlot(at("12:00"), MORNING), false);
  assert.equal(isWithinSlot(at("05:50"), MORNING), false);
  assert.equal(isWithinSlot(at("05:50"), MORNING, 15), true);
  assert.equal(isWithinSlot(at("01:00"), OVERNIGHT), true);
  assert.equal(isWithinSlot(at("21:50"), OVERNIGHT, 15), true);
  assert.equal(isWithinSlot(at("07:00"), OVERNIGHT), false);
});

test("sit-anywhere capacity counts how many slots run at the same time", () => {
  const booked = [MORNING, EVENING, FULL_DAY];
  assert.equal(peakOccupancy(booked), 2, "Morning+Full Day, then Evening+Full Day");
  assert.equal(peakDuringSlot(booked, NIGHT), 1, "only Full Day overlaps the night");
  assert.equal(peakDuringSlot(booked, OVERNIGHT), 1);
  assert.equal(peakDuringSlot([], MORNING), 0);
});

test("clock helpers", () => {
  assert.equal(minutesToClock(390), "06:30");
  assert.equal(clockToMinutes("23:30"), 1410);
  assert.equal(clockToMinutes("24:00"), null);
  assert.equal(displaySlotTimes(OVERNIGHT), "10:00 pm – 6:00 am");
  assert.equal(displaySlotTimes(EVENING), "12:00 pm – 6:00 pm");
});
