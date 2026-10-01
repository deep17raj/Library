import assert from "node:assert/strict";
import { test } from "node:test";
import { dailyCode, verifyDailyCode } from "./dailyCode.js";

const SECRET = "test-secret-at-least-32-characters-long!!";
const TENANT = "11111111-1111-1111-1111-111111111111";

test("the code is 6 unambiguous characters", () => {
  const code = dailyCode(SECRET, TENANT, "2026-10-01");
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal(/[01OI]/.test(code), false);
});

test("it changes by day and by library, and is stable within one", () => {
  assert.equal(dailyCode(SECRET, TENANT, "2026-10-01"), dailyCode(SECRET, TENANT, "2026-10-01"));
  assert.notEqual(dailyCode(SECRET, TENANT, "2026-10-01"), dailyCode(SECRET, TENANT, "2026-10-02"));
  assert.notEqual(
    dailyCode(SECRET, TENANT, "2026-10-01"),
    dailyCode(SECRET, "22222222-2222-2222-2222-222222222222", "2026-10-01"),
  );
});

test("verify accepts today's code case-insensitively and rejects others", () => {
  const code = dailyCode(SECRET, TENANT, "2026-10-01");
  assert.equal(verifyDailyCode(SECRET, TENANT, "2026-10-01", code.toLowerCase()), true);
  assert.equal(verifyDailyCode(SECRET, TENANT, "2026-10-01", "ZZZZZZ"), false);
  assert.equal(verifyDailyCode(SECRET, TENANT, "2026-10-01", ""), false);
  assert.equal(verifyDailyCode(SECRET, TENANT, "2026-10-02", code), false);
});
