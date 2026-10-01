import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateCheckin, minutesFromSlot } from "./checkin.js";

const morning = { subscriptionId: "m", slotName: "Morning", startMin: 360, endMin: 720 }; // 6–12
const evening = { subscriptionId: "e", slotName: "Evening", startMin: 720, endMin: 1080 }; // 12–18
const night = { subscriptionId: "n", slotName: "Night", startMin: 1320, endMin: 180 }; // 22–03 wrap

test("inside the slot records without the outside flag", () => {
  const r = evaluateCheckin({ nowMin: 540, bookings: [morning], mode: "block" });
  assert.deepEqual(r, { decision: "record", booking: morning, outsideSlot: false });
});

test("early-minutes window lets a student in just before the slot", () => {
  const r = evaluateCheckin({ nowMin: 350, bookings: [morning], mode: "block", earlyMinutes: 15 });
  assert.equal(r.decision, "record");
  assert.equal(r.outsideSlot, false);
});

test("warn mode records outside the slot with the flag", () => {
  const r = evaluateCheckin({ nowMin: 800, bookings: [morning], mode: "warn" });
  assert.equal(r.decision, "record");
  assert.equal(r.outsideSlot, true);
  assert.equal(r.booking, morning);
});

test("off mode records outside the slot too", () => {
  const r = evaluateCheckin({ nowMin: 800, bookings: [morning], mode: "off" });
  assert.equal(r.decision, "record");
  assert.equal(r.outsideSlot, true);
});

test("block mode refuses outside every slot and names the nearest", () => {
  const r = evaluateCheckin({ nowMin: 300, bookings: [morning, evening], mode: "block" });
  assert.equal(r.decision, "block");
  assert.equal(r.booking, morning); // 6am start is nearer to 5am than evening
});

test("picks the slot that contains now when a member has two bookings", () => {
  const r = evaluateCheckin({ nowMin: 900, bookings: [morning, evening], mode: "block" });
  assert.equal(r.decision, "record");
  assert.equal(r.booking, evening);
  assert.equal(r.outsideSlot, false);
});

test("no active booking yields the none decision", () => {
  const r = evaluateCheckin({ nowMin: 540, bookings: [], mode: "warn" });
  assert.deepEqual(r, { decision: "none", booking: null, outsideSlot: false });
});

test("an overnight slot contains times after midnight", () => {
  assert.equal(minutesFromSlot(60, night), 0); // 1am is inside 22:00–03:00
  const r = evaluateCheckin({ nowMin: 60, bookings: [night], mode: "block" });
  assert.equal(r.decision, "record");
  assert.equal(r.outsideSlot, false);
});
