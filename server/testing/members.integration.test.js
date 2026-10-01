import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { TEST_DATABASE_URL } from "./testDatabase.js";
import { startTestApp } from "./testApp.js";
import { seatIdByLabel } from "./seed.js";

// Milestone 4 end-to-end: adding members with seat bookings, the seat map, swaps,
// photos and private ID proofs, and the waitlist. Tests share state and run in order.
const skip = !TEST_DATABASE_URL && "set TEST_DATABASE_URL to run integration tests";

let app;
let owner;
const ids = { seat: {}, slot: {}, plan: {}, member: {} };

before(async () => {
  if (skip) return;
  app = await startTestApp("members");
  ({ owner } = await app.createLibraryWithOwner("members"));
  const hall = (
    await owner.post("/admin/halls", { name: "Hall A", seatingMode: "fixed", categoryId: null })
  ).body;
  ids.hall = hall.layout.halls[0].id;
  const layout = (
    await owner.post(`/admin/halls/${ids.hall}/tables`, {
      tableCount: 1,
      seatsPerTable: 3,
      seatPrefix: "A-",
      startNumber: 1,
    })
  ).body.layout;
  for (const label of ["A-1", "A-2", "A-3"]) ids.seat[label] = seatIdByLabel(layout, label);
  for (const [name, start, end] of [
    ["Morning", 360, 720],
    ["Evening", 720, 1080],
  ]) {
    const { body } = await owner.post("/admin/slots", {
      name,
      startMin: start,
      endMin: end,
      monthlyFeePaise: 80000,
    });
    const slot = body.slots.find((s) => s.name === name);
    ids.slot[name] = slot.id;
    ids.plan[name] = slot.plans[0].id;
  }
});
after(async () => app?.stop());

const booking = (slot, seat) => ({
  slotId: ids.slot[slot],
  planId: ids.plan[slot],
  seatId: ids.seat[seat],
});
const addMember = (name, phone, bookings = [], extra = {}) =>
  owner.post("/admin/members", { name, phone, bookings, ...extra });

test("adding members gives sequential codes and seats them", { skip }, async () => {
  const ravi = await addMember("Ravi Kumar", "9876500001", [booking("Morning", "A-1")]);
  assert.equal(ravi.status, 201);
  assert.equal(ravi.body.member.memberCode, "S1001");
  assert.equal(ravi.body.subscriptions[0].seat.label, "A-1");
  ids.member.ravi = ravi.body.member.id;

  const asha = await addMember("Asha Rao", "9876500002", [booking("Evening", "A-1")]);
  assert.equal(asha.body.member.memberCode, "S1002");
  ids.member.asha = asha.body.member.id;
});

test("the seat map shows Morning and Evening students sharing A-1", { skip }, async () => {
  const { seatMap } = (await owner.get(`/admin/seat-map?hallId=${ids.hall}`)).body;
  const seat = seatMap.tables[0].seats.find((s) => s.label === "A-1");
  assert.deepEqual(
    seat.occupants.map((o) => [o.slotName, o.memberName]),
    [
      ["Morning", "Ravi Kumar"],
      ["Evening", "Asha Rao"],
    ],
  );
  assert.equal(seatMap.hall.capacity, 3);
});

test("a duplicate mobile number is refused on the phone field", { skip }, async () => {
  const duplicate = await addMember("Someone Else", "+91 98765 00001");
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, "PHONE_TAKEN");
  assert.match(duplicate.body.error.fields.phone, /Ravi Kumar \(S1001\)/);
});

test("one taken seat saves nothing and points at that booking", { skip }, async () => {
  const kiran = await addMember("Kiran Shah", "9876500003", [
    booking("Morning", "A-2"),
    booking("Evening", "A-1"),
  ]);
  assert.equal(kiran.status, 409);
  assert.ok(kiran.body.error.fields["bookings.1.seatId"]);
  assert.match(kiran.body.error.message, /^Booking 2:/);

  const search = (await owner.get("/admin/members?q=Kiran")).body;
  assert.equal(search.total, 0, "Kiran was not saved");
  const morning = (await owner.get(`/admin/availability?slotId=${ids.slot.Morning}`)).body
    .availability;
  assert.ok(morning.freeSeatIds.includes(ids.seat["A-2"]), "booking 1 was rolled back too");

  const meena = await addMember("Meena Iyer", "9876500004", [booking("Morning", "A-2")]);
  assert.equal(meena.body.member.memberCode, "S1003", "the rolled-back number was given back");
  ids.member.meena = meena.body.member.id;
  ids.meenaSub = meena.body.subscriptions[0].id;
});

test("the members list searches and filters by slot", { skip }, async () => {
  const byName = (await owner.get("/admin/members?q=ravi")).body;
  assert.equal(byName.total, 1);
  assert.deepEqual(
    byName.members[0].placements.map((p) => [p.slotName, p.seatLabel]),
    [["Morning", "A-1"]],
  );
  const evening = (await owner.get(`/admin/members?slotId=${ids.slot.Evening}`)).body;
  assert.deepEqual(
    evening.members.map((m) => m.name),
    ["Asha Rao"],
  );
});

test(
  "swapping two Morning students shows on the seat map and in seat history",
  { skip },
  async () => {
    const raviSub = (await owner.get(`/admin/members/${ids.member.ravi}`)).body.subscriptions[0].id;
    const swap = await owner.post("/admin/subscriptions/swap", {
      subscriptionA: raviSub,
      subscriptionB: ids.meenaSub,
    });
    assert.equal(swap.status, 200);
    const { seatMap } = (await owner.get(`/admin/seat-map?hallId=${ids.hall}`)).body;
    const morningOn = (label) =>
      seatMap.tables[0].seats
        .find((s) => s.label === label)
        .occupants.find((o) => o.slotName === "Morning");
    assert.equal(morningOn("A-1").memberName, "Meena Iyer");
    assert.equal(morningOn("A-2").memberName, "Ravi Kumar");

    const { history } = (await owner.get(`/admin/seats/${ids.seat["A-1"]}/history`)).body;
    assert.deepEqual(
      history.filter((h) => h.slotName === "Morning").map((h) => [h.memberName, h.status]),
      [
        ["Meena Iyer", "active"],
        ["Ravi Kumar", "ended"],
      ],
    );
  },
);

test("photos are public; ID proofs are private and need members.manage", { skip }, async () => {
  const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#888" } })
    .png()
    .toBuffer();
  const photo = await owner.upload(`/admin/members/${ids.member.asha}/photo`, "photo", png);
  assert.equal(photo.status, 200);
  assert.equal((await fetch(`${app.origin}${photo.body.member.photoUrl}`)).status, 200);

  const proof = await owner.upload(`/admin/members/${ids.member.asha}/id-proof`, "idProof", png);
  assert.equal(proof.body.member.hasIdProof, true);
  assert.equal(JSON.stringify(proof.body).includes("id-proof-"), false, "no storage path leaks");
  const download = await fetch(`${app.baseUrl}/admin/members/${ids.member.asha}/id-proof`, {
    headers: { Cookie: await ownerCookie() },
  });
  assert.equal(download.status, 200);
  assert.match(download.headers.get("cache-control"), /no-store/);

  await owner.post("/admin/staff", {
    name: "Desk",
    email: "desk@members.test",
    password: "desk-password",
    permissions: [],
  });
  const desk = await app.signedIn("desk@members.test", "desk-password");
  assert.equal((await desk.get(`/admin/members/${ids.member.asha}/id-proof`)).status, 403);
  assert.equal(
    (await desk.get(`/admin/members/${ids.member.asha}`)).status,
    200,
    "staff may view members",
  );
});

async function ownerCookie() {
  const response = await fetch(`${app.baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "app" },
    body: JSON.stringify({ email: "owner@members.test", password: "owner-password" }),
  });
  return response.headers.get("set-cookie").split(";")[0];
}

test("a member with bookings can't be made inactive until they end", { skip }, async () => {
  const refused = await owner.patch(`/admin/members/${ids.member.asha}`, { status: "inactive" });
  assert.equal(refused.body.error.code, "IN_USE");
  const sub = (await owner.get(`/admin/members/${ids.member.asha}`)).body.subscriptions[0];
  await owner.post(`/admin/subscriptions/${sub.id}/end`, { reason: "left" });
  const done = await owner.patch(`/admin/members/${ids.member.asha}`, { status: "inactive" });
  assert.equal(done.body.member.status, "inactive");
});

test("the waitlist queues per slot and converts with the new member", { skip }, async () => {
  const entry = (name, phone) =>
    owner.post("/admin/waitlist", { slotId: ids.slot.Morning, name, phone });
  const zoya = (await entry("Zoya Khan", "9876500010")).body.entry;
  await entry("Om Prakash", "9876500011");
  let queue = (await owner.get(`/admin/waitlist?slotId=${ids.slot.Morning}`)).body.entries;
  assert.deepEqual(
    queue.map((e) => [e.name, e.position]),
    [
      ["Zoya Khan", 1],
      ["Om Prakash", 2],
    ],
  );

  const seated = await addMember("Zoya Khan", "9876500010", [booking("Morning", "A-3")], {
    waitlistEntryId: zoya.id,
  });
  assert.equal(seated.status, 201);
  queue = (await owner.get(`/admin/waitlist?slotId=${ids.slot.Morning}`)).body.entries;
  assert.deepEqual(
    queue.map((e) => [e.name, e.position]),
    [["Om Prakash", 1]],
  );

  const again = await addMember("Zoya Twin", "9876500012", [], { waitlistEntryId: zoya.id });
  assert.equal(again.status, 409, "a converted entry can't convert twice");
  assert.equal(
    (await owner.get("/admin/members?q=Twin")).body.total,
    0,
    "and the member was not saved",
  );
});
