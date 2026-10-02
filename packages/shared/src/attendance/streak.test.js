import assert from "node:assert/strict";
import { test } from "node:test";
import { attendanceStreak } from "./streak.js";

test("counts consecutive days ending today", () => {
  assert.equal(attendanceStreak(["2026-10-13", "2026-10-14", "2026-10-15"], "2026-10-15"), 3);
});

test("not in yet today: the streak runs up to yesterday", () => {
  assert.equal(attendanceStreak(["2026-10-13", "2026-10-14"], "2026-10-15"), 2);
});

test("a gap ends the streak; no recent visits means zero", () => {
  assert.equal(attendanceStreak(["2026-10-10", "2026-10-12", "2026-10-13"], "2026-10-13"), 2);
  assert.equal(attendanceStreak(["2026-10-01"], "2026-10-15"), 0);
  assert.equal(attendanceStreak([], "2026-10-15"), 0);
});

test("works across a month boundary", () => {
  assert.equal(attendanceStreak(["2026-09-30", "2026-10-01"], "2026-10-01"), 2);
});
