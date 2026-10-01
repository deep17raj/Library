import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bulkTablesSchema,
  createStaffSchema,
  librarySettingsSchema,
  phoneField,
  rupeesField,
  seatCategoryFormSchema,
  seatUpdateSchema,
} from "./index.js";

const settings = {
  displayName: "Sardar Patel Library",
  address: "",
  contactPhone: "+91 98765 43210",
  timezone: "Asia/Kolkata",
  brandColor: "#4f46e5",
  receiptPrefix: "R",
  memberCodePrefix: "S",
};

test("phoneField keeps the 10 digits of an Indian mobile number", () => {
  assert.equal(phoneField.parse("+91 98765-43210"), "9876543210");
  assert.equal(phoneField.parse("09876543210"), "9876543210");
  assert.equal(phoneField.parse(""), "");
  assert.equal(phoneField.safeParse("12345").success, false);
});

test("rupeesField converts typed rupees to paise", () => {
  assert.equal(rupeesField.parse("1,250.50"), 125050);
  assert.equal(rupeesField.safeParse("abc").success, false);
});

test("librarySettingsSchema normalises phone and rejects a bad timezone or colour", () => {
  assert.equal(librarySettingsSchema.parse(settings).contactPhone, "9876543210");
  assert.equal(
    librarySettingsSchema.safeParse({ ...settings, timezone: "Mars/Base" }).success,
    false,
  );
  assert.equal(librarySettingsSchema.safeParse({ ...settings, brandColor: "blue" }).success, false);
});

test("createStaffSchema accepts only known permissions and drops repeats", () => {
  const base = { name: "Asha", email: "asha@x.com", password: "long-enough" };
  const parsed = createStaffSchema.parse({
    ...base,
    permissions: ["members.manage", "members.manage"],
  });
  assert.deepEqual(parsed.permissions, ["members.manage"]);
  assert.equal(createStaffSchema.safeParse({ ...base, permissions: ["root"] }).success, false);
});

test("seatCategoryFormSchema sends the surcharge in paise", () => {
  assert.deepEqual(seatCategoryFormSchema.parse({ name: "AC", monthlySurcharge: "300" }), {
    name: "AC",
    monthlySurchargePaise: 30000,
  });
});

test("bulkTablesSchema caps one request at 500 seats", () => {
  const plan = { tableCount: 20, seatsPerTable: 30, seatPrefix: "A-", startNumber: 1 };
  assert.equal(bulkTablesSchema.safeParse(plan).success, false);
  assert.equal(bulkTablesSchema.safeParse({ ...plan, seatsPerTable: 25 }).success, true);
});

test("seatUpdateSchema validates labels and features", () => {
  assert.deepEqual(seatUpdateSchema.parse({ features: ["window", "window"] }).features, ["window"]);
  assert.equal(seatUpdateSchema.safeParse({ features: ["jacuzzi"] }).success, false);
  assert.equal(seatUpdateSchema.safeParse({ label: "A 12" }).success, false);
});
