import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeAudit, fakeDb } from "../../../testing/fakes.js";
import { dailyCode } from "../../lib/dailyCode.js";
import { createAttendanceService } from "./attendance.service.js";

const SECRET = "test-secret-that-is-long-enough-for-hs256";
const TENANT = "lib-1";
const CTX = { tenantId: TENANT, actor: { id: "staff-1", role: "admin" } };
const MORNING = { subscriptionId: "sub-m", slotName: "Morning", startMin: 360, endMin: 720 };
const member = { id: "mem-1", name: "Ravi", phone: "9000000001" };

// IST = UTC+5:30. 03:30Z → 09:00 IST (inside Morning). 14:30Z → 20:00 IST (outside).
const AT_0900 = () => new Date("2026-10-01T03:30:00Z");
const AT_2000 = () => new Date("2026-10-01T14:30:00Z");

function fakeAttendanceRepo() {
  const rows = new Map(); // id -> row
  const key = (sub, day) => `${sub}|${day}`;
  const byKey = new Map();
  return {
    rows,
    findForDay: async (db, t, sub, day) => byKey.get(key(sub, day)) || null,
    insertAttendance: async (db, t, a) => {
      const row = { ...a, checkOutAt: null };
      rows.set(a.id, row);
      byKey.set(key(a.subscriptionId, a.localDate), row);
    },
    markCheckOut: async (db, t, id) => {
      rows.get(id).checkOutAt = "2026-10-01T04:00:00Z";
    },
    findById: async (db, t, id) => rows.get(id) || null,
    countPresentOnDay: async () => rows.size,
    listForDay: async () => [...rows.values()],
    listForMemberRange: async () => [...rows.values()],
  };
}

function setup({
  mode = "warn",
  allowOverdueCheckin = true,
  overduePaise = 0,
  bookings = [MORNING],
  now = AT_0900,
} = {}) {
  const repo = fakeAttendanceRepo();
  const audit = fakeAudit();
  const service = createAttendanceService({
    db: fakeDb(),
    repo,
    subscriptions: { listActiveSlotsOfMember: async () => bookings },
    members: {
      findMember: async () => member,
      findMemberByPhone: async (db, t, phone) => (phone === member.phone ? member : null),
    },
    settings: {
      attendance: async () => ({
        timezone: "Asia/Kolkata",
        slotCheckMode: mode,
        slotEarlyMinutes: 15,
        allowOverdueCheckin,
      }),
    },
    libraries: { findLibraryById: async () => ({ id: TENANT, slug: "demo", status: "active" }) },
    billing: { memberOverduePaise: async () => overduePaise },
    audit,
    secret: SECRET,
    now,
  });
  return { service, repo, audit };
}

test("inside the slot: a kiosk check-in with the right code is recorded", async () => {
  const { service } = setup();
  const code = dailyCode(SECRET, TENANT, "2026-10-01");
  const result = await service.checkInByPhone(CTX, { phone: member.phone, code });
  assert.equal(result.action, "checked_in");
  assert.equal(result.outsideSlot, false);
});

test("a second check-in the same day is a check-out", async () => {
  const { service } = setup();
  const code = dailyCode(SECRET, TENANT, "2026-10-01");
  await service.checkInByPhone(CTX, { phone: member.phone, code });
  const second = await service.checkInByPhone(CTX, { phone: member.phone, code });
  assert.equal(second.action, "checked_out");
  assert.ok(second.attendance.checkOutAt);
});

test("warn mode records an outside-slot check-in with the flag", async () => {
  const { service } = setup({ mode: "warn", now: AT_2000 });
  const result = await service.markManually(CTX, { memberId: member.id });
  assert.equal(result.action, "checked_in");
  assert.equal(result.outsideSlot, true);
});

test("block mode refuses a check-in outside the slot", async () => {
  const { service } = setup({ mode: "block", now: AT_2000 });
  const code = dailyCode(SECRET, TENANT, "2026-10-01");
  await assert.rejects(
    service.checkInByPhone(CTX, { phone: member.phone, code }),
    /Outside booked time/,
  );
});

test("staff can override the block gate", async () => {
  const { service } = setup({ mode: "block", now: AT_2000 });
  const result = await service.markManually(CTX, { memberId: member.id });
  assert.equal(result.action, "checked_in");
  assert.equal(result.outsideSlot, true);
});

test("dues gate refuses when overdue and the library forbids it", async () => {
  const { service } = setup({ allowOverdueCheckin: false, overduePaise: 50000 });
  const code = dailyCode(SECRET, TENANT, "2026-10-01");
  await assert.rejects(service.checkInByPhone(CTX, { phone: member.phone, code }), /dues to clear/);
});

test("dues are recorded but allowed when the library permits it", async () => {
  const { service } = setup({ allowOverdueCheckin: true, overduePaise: 50000 });
  const code = dailyCode(SECRET, TENANT, "2026-10-01");
  const result = await service.checkInByPhone(CTX, { phone: member.phone, code });
  assert.equal(result.action, "checked_in");
  assert.equal(result.hadDues, true);
});

test("a wrong code and an unknown phone both fail without revealing which", async () => {
  const { service } = setup();
  await assert.rejects(
    service.checkInByPhone(CTX, { phone: member.phone, code: "ZZZZZZ" }),
    /not today's code/,
  );
  const code = dailyCode(SECRET, TENANT, "2026-10-01");
  await assert.rejects(
    service.checkInByPhone(CTX, { phone: "9999999999", code }),
    /No booking found/,
  );
});

test("no active booking is refused", async () => {
  const { service } = setup({ bookings: [] });
  await assert.rejects(service.markManually(CTX, { memberId: member.id }), /no active booking/i);
});

test("the desk shows today's code and the QR target", async () => {
  const { service } = setup();
  const desk = await service.getDesk(CTX);
  assert.equal(desk.code, dailyCode(SECRET, TENANT, "2026-10-01"));
  assert.equal(desk.checkinPath, `/s/demo/checkin?code=${desk.code}`);
});
