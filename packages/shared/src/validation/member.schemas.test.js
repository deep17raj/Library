import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemberSchema, memberListQuerySchema, updateMemberSchema } from "./index.js";

const ID = "11111111-1111-4111-8111-111111111111";

test("createMemberSchema normalises the phone and defaults the optional parts", () => {
  const member = createMemberSchema.parse({ name: "Asha Rao", phone: "+91 98765 43210" });
  assert.equal(member.phone, "9876543210");
  assert.deepEqual(member.bookings, []);
  assert.equal(member.examTarget, "");
});

test("a member needs a phone, and each booking a seat or a hall", () => {
  assert.equal(createMemberSchema.safeParse({ name: "Asha Rao", phone: "" }).success, false);
  const booking = { slotId: ID, planId: ID };
  const result = createMemberSchema.safeParse({
    name: "Asha Rao",
    phone: "9876543210",
    bookings: [booking],
  });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path.join("."), "bookings.0.seatId");
});

test("list query defaults and limits", () => {
  assert.deepEqual(memberListQuerySchema.parse({}), {
    q: "",
    status: "active",
    page: 1,
    pageSize: 25,
  });
  assert.equal(memberListQuerySchema.safeParse({ pageSize: "500" }).success, false);
  assert.equal(updateMemberSchema.safeParse({ status: "gone" }).success, false);
});

test("the add-member form turns rupees into paise and empty into none", async () => {
  const { memberFormSchema } = await import("./index.js");
  const parsed = memberFormSchema.parse({
    name: "Asha Rao",
    phone: "9876543210",
    admissionFee: "500",
    deposit: "",
    bookings: [{ slotId: ID, planId: ID, seatId: ID, lockerFee: "100" }],
  });
  assert.equal(parsed.admissionFeePaise, 50000);
  assert.equal(parsed.depositPaise, 0);
  assert.equal(parsed.bookings[0].lockerFeePaise, 10000);
});
