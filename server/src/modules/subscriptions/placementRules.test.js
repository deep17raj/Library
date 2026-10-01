import { test } from "node:test";
import assert from "node:assert/strict";
import { clockToMinutes } from "@app/shared/slots";
import {
  hallHasRoom,
  memberOverlapError,
  memberOverlaps,
  seatConflicts,
  seatTakenError,
} from "./placementRules.js";

const slot = (slotName, start, end) => ({
  slotName,
  startMin: clockToMinutes(start),
  endMin: clockToMinutes(end),
});
const MORNING = slot("Morning", "06:00", "12:00");
const EVENING = slot("Evening", "12:00", "18:00");
const NIGHT = slot("Night", "18:00", "23:00");
const FULL_DAY = slot("Full Day", "06:00", "23:00");

test("a seat holds Morning and Evening students but not Morning + Full Day", () => {
  const onSeat = [{ ...MORNING, memberName: "Ravi" }];
  assert.deepEqual(seatConflicts(onSeat, EVENING), []);
  assert.equal(seatConflicts(onSeat, FULL_DAY).length, 1);

  const shared = [...onSeat, { ...EVENING, memberName: "Asha" }];
  assert.deepEqual(seatConflicts(shared, NIGHT), [], "a third student can take the night");
  assert.deepEqual(
    seatConflicts(shared, FULL_DAY).map((c) => c.memberName),
    ["Ravi", "Asha"],
  );
});

test("the conflict message names who holds the seat and when", () => {
  const error = seatTakenError("A-12", [{ ...MORNING, memberName: "Ravi" }]);
  assert.equal(error.code, "SEAT_SLOT_TAKEN");
  assert.equal(error.status, 409);
  assert.match(error.message, /A-12 .* Ravi \(Morning, 6:00 am – 12:00 pm\)/);
  assert.ok(error.fields.seatId);
});

test("a student can't hold two overlapping slots", () => {
  const held = [{ ...MORNING, subscriptionId: "s1" }];
  assert.deepEqual(memberOverlaps(held, EVENING), []);
  const overlaps = memberOverlaps(held, FULL_DAY);
  assert.equal(overlaps.length, 1);
  assert.match(memberOverlapError(overlaps).message, /already has Morning/);
});

test("a sit-anywhere hall is full when every seat is used at some moment of the slot", () => {
  const twoSeats = 2;
  assert.equal(hallHasRoom([MORNING, EVENING], FULL_DAY, twoSeats), true, "never two at once");
  assert.equal(hallHasRoom([MORNING, FULL_DAY], MORNING, twoSeats), false);
  assert.equal(hallHasRoom([MORNING, FULL_DAY], NIGHT, twoSeats), true, "only Full Day at night");
  assert.equal(hallHasRoom([], MORNING, 0), false, "a hall without seats has no room");
});
