import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSubscriptionSchema,
  planFormSchema,
  slotFormSchema,
  slotSchema,
  slotUpdateSchema,
  swapSeatsSchema,
} from "./index.js";

const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";

test("slotFormSchema turns clock times and rupees into the API shape", () => {
  const parsed = slotFormSchema.parse({
    name: "Morning",
    startTime: "06:00",
    endTime: "12:00",
    monthlyFee: "800",
  });
  assert.deepEqual(parsed, { name: "Morning", startMin: 360, endMin: 720, monthlyFeePaise: 80000 });
  const offGrid = { name: "X", startTime: "06:15", endTime: "12:00" };
  assert.equal(slotFormSchema.safeParse(offGrid).success, false);
  const night = { name: "Night", startTime: "22:00", endTime: "06:00" };
  assert.equal(slotFormSchema.parse(night).endMin, 360);
});

test("slot schemas reject off-grid or empty slots and half-edited times", () => {
  const empty = { name: "X", startMin: 360, endMin: 360, monthlyFeePaise: 0 };
  assert.equal(slotSchema.safeParse(empty).success, false);
  assert.equal(slotUpdateSchema.safeParse({ startMin: 360 }).success, false);
  assert.equal(slotUpdateSchema.safeParse({ name: "Renamed" }).success, true);
});

test("planFormSchema limits monthly plans to 24 months", () => {
  const plan = { name: "Yearly", periodUnit: "month", periodCount: "12", price: "8000" };
  assert.equal(planFormSchema.parse(plan).pricePaise, 800000);
  assert.equal(planFormSchema.safeParse({ ...plan, periodCount: "36" }).success, false);
  const days = { ...plan, periodUnit: "day", periodCount: "36" };
  assert.equal(planFormSchema.safeParse(days).success, true);
});

test("a subscription needs exactly one of seat or sit-anywhere hall", () => {
  const base = { slotId: ID, planId: ID2 };
  assert.equal(createSubscriptionSchema.safeParse(base).success, false);
  assert.equal(
    createSubscriptionSchema.safeParse({ ...base, seatId: ID, hallId: ID2 }).success,
    false,
  );
  assert.equal(createSubscriptionSchema.parse({ ...base, seatId: ID }).lockerFeePaise, 0);
  assert.equal(swapSeatsSchema.safeParse({ subscriptionA: ID, subscriptionB: ID }).success, false);
});
