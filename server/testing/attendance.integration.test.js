import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { TEST_DATABASE_URL } from "./testDatabase.js";
import { startTestApp } from "./testApp.js";
import { seatIdByLabel } from "./seed.js";

// Milestone 6 end-to-end: the daily code, kiosk check-in/out, manual marking, the dues
// gate, the attendance list and its CSV. The slot gate is set to "off" so the test does
// not depend on the wall clock (the off/warn/block decision is unit-tested in shared).
const skip = !TEST_DATABASE_URL && "set TEST_DATABASE_URL to run integration tests";

let app;
let owner;
let slug;
const ids = {};

async function addMember(name, phone, seatLabel) {
  const created = await owner.post("/admin/members", {
    name,
    phone,
    bookings: [
      { slotId: ids.slotId, planId: ids.planId, seatId: seatIdByLabel(ids.layout, seatLabel) },
    ],
  });
  return created.body.member.id;
}

before(async () => {
  if (skip) return;
  app = await startTestApp("attend");
  ({ owner } = await app.createLibraryWithOwner("attend"));
  slug = "attend";
  const hall = (
    await owner.post("/admin/halls", { name: "Hall A", seatingMode: "fixed", categoryId: null })
  ).body;
  ids.layout = (
    await owner.post(`/admin/halls/${hall.layout.halls[0].id}/tables`, {
      tableCount: 1,
      seatsPerTable: 3,
      seatPrefix: "A-",
      startNumber: 1,
    })
  ).body.layout;
  const slot = (
    await owner.post("/admin/slots", {
      name: "Morning",
      startMin: 360,
      endMin: 720,
      monthlyFeePaise: 80000,
    })
  ).body.slots[0];
  ids.slotId = slot.id;
  ids.planId = slot.plans[0].id;
  // Don't let the wall clock decide: accept any time, but keep the dues gate on.
  await owner.put("/admin/settings/checkin", {
    slotCheckMode: "off",
    slotEarlyMinutes: 15,
    allowOverdueCheckin: true,
  });
  ids.ravi = await addMember("Ravi Kumar", "9876500001", "A-1");
  ids.sia = await addMember("Sia Rao", "9876500002", "A-2");
});
after(async () => app?.stop());

const desk = async () => (await owner.get("/admin/checkin/desk")).body;
const kiosk = (phone, code) => owner.post(`/s/${slug}/kiosk/checkin`, { phone, code });

test("the desk shows a 6-character code and the QR target", { skip }, async () => {
  const body = await desk();
  assert.match(body.code, /^[A-Z2-9]{6}$/);
  assert.equal(body.slug, slug);
  assert.equal(body.checkinPath, `/s/${slug}/checkin?code=${body.code}`);
  assert.equal(body.presentCount, 0);
});

test("a wrong code is refused", { skip }, async () => {
  const res = await kiosk("9876500001", "ZZZZZZ");
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "INVALID_CODE");
});

test(
  "the right code checks a student in, and a second scan checks them out",
  { skip },
  async () => {
    const { code } = await desk();
    const inRes = await kiosk("9876500001", code);
    assert.equal(inRes.body.action, "checked_in");
    assert.equal(inRes.body.member.name, "Ravi Kumar");

    const list = (await owner.get("/admin/attendance")).body;
    assert.equal(list.presentCount, 1);

    const outRes = await kiosk("9876500001", code);
    assert.equal(outRes.body.action, "checked_out");
    const after = (await owner.get("/admin/attendance")).body;
    assert.ok(after.present[0].checkOutAt, "check-out time is set");
  },
);

test("staff can mark a walk-in present", { skip }, async () => {
  const res = await owner.post("/admin/attendance", { memberId: ids.sia });
  assert.equal(res.status, 201);
  assert.equal(res.body.action, "checked_in");
  const list = (await owner.get("/admin/attendance")).body;
  assert.equal(list.presentCount, 2);
});

test("the dues gate refuses a kiosk check-in when the library forbids it", { skip }, async () => {
  await owner.put("/admin/settings/checkin", {
    slotCheckMode: "off",
    slotEarlyMinutes: 15,
    allowOverdueCheckin: false,
  });
  const alex = await addMember("Alex Roy", "9876500003", "A-3");
  assert.ok(alex);
  // Alex owes the first month's fee (due today), so the gate stops the check-in.
  const { code } = await desk();
  const res = await kiosk("9876500003", code);
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, "DUES_OVERDUE");
  // Restore for any later runs.
  await owner.put("/admin/settings/checkin", {
    slotCheckMode: "off",
    slotEarlyMinutes: 15,
    allowOverdueCheckin: true,
  });
});

test("attendance CSV lists the present students", { skip }, async () => {
  const token = await owner.cookie();
  const res = await fetch(`${app.baseUrl}/admin/export/attendance.csv`, {
    headers: { Cookie: token, "X-Requested-With": "app" },
  });
  const text = await res.text();
  assert.match(text, /Member/);
  assert.match(text, /Ravi Kumar/);
});

test("a member's month shows their check-ins", { skip }, async () => {
  const body = (await owner.get(`/admin/members/${ids.ravi}/attendance`)).body;
  assert.equal(body.attendance.length, 1);
  assert.equal(body.attendance[0].memberName, "Ravi Kumar");
});
