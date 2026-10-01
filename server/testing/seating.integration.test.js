import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { addMonthsToDateKey } from "@app/shared/billing";
import { TEST_DATABASE_URL } from "./testDatabase.js";
import { startTestApp } from "./testApp.js";
import { insertMember, seatIdByLabel } from "./seed.js";

// Milestone 3 end-to-end: the seat/slot rules through HTTP against real MySQL —
// including two bookings racing for one seat, and the database refusing an
// overlap written behind the service's back. Tests share state and run in order.
const skip = !TEST_DATABASE_URL && "set TEST_DATABASE_URL to run integration tests";

let app;
let owner;
let libraryId;
const ids = { slot: {}, plan: {}, seat: {}, member: {}, sub: {} };

const at = (clock) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));

async function createSlot(name, start, end, feeRupees) {
  const { body } = await owner.post("/admin/slots", {
    name,
    startMin: at(start),
    endMin: at(end),
    monthlyFeePaise: feeRupees * 100,
  });
  const slot = body.slots.find((s) => s.name === name);
  ids.slot[name] = slot.id;
  ids.plan[name] = slot.plans[0].id;
}

const subscribe = (member, slot, place) =>
  owner.post(`/admin/members/${ids.member[member]}/subscriptions`, {
    slotId: ids.slot[slot],
    planId: ids.plan[slot],
    ...place,
  });

before(async () => {
  if (skip) return;
  app = await startTestApp("seating");
  const created = await app.createLibraryWithOwner("seating");
  ({ owner } = created);
  libraryId = created.library.id;

  const category = (
    await owner.post("/admin/seat-categories", { name: "AC", monthlySurchargePaise: 30000 })
  ).body;
  const acId = category.layout.categories[0].id;
  let layout = (
    await owner.post("/admin/halls", { name: "Hall A", seatingMode: "fixed", categoryId: null })
  ).body.layout;
  const hallA = layout.halls[0].id;
  layout = (
    await owner.post(`/admin/halls/${hallA}/tables`, {
      tableCount: 1,
      seatsPerTable: 4,
      seatPrefix: "A-",
      startNumber: 1,
    })
  ).body.layout;
  layout = (await owner.patch(`/admin/seats/${seatIdByLabel(layout, "A-4")}`, { categoryId: acId }))
    .body.layout;
  layout = (
    await owner.post("/admin/halls", {
      name: "Open Hall",
      seatingMode: "floating",
      categoryId: null,
    })
  ).body.layout;
  ids.openHall = layout.halls.find((h) => h.name === "Open Hall").id;
  ids.hallA = hallA;
  layout = (
    await owner.post(`/admin/halls/${ids.openHall}/tables`, {
      tableCount: 1,
      seatsPerTable: 2,
      seatPrefix: "F-",
      startNumber: 1,
    })
  ).body.layout;
  for (const label of ["A-1", "A-2", "A-3", "A-4", "F-1"])
    ids.seat[label] = seatIdByLabel(layout, label);

  await createSlot("Morning", "06:00", "12:00", 800);
  await createSlot("Evening", "12:00", "18:00", 700);
  await createSlot("Night", "18:00", "23:00", 600);
  await createSlot("Full Day", "06:00", "23:00", 1500);
  for (const name of [
    "Ravi",
    "Asha",
    "Kiran",
    "Meena",
    "Neha",
    "Om",
    "Pia",
    "Xavi",
    "Yash",
    "Zoya",
  ]) {
    ids.member[name] = await insertMember(app.pool, libraryId, name);
  }
});
after(async () => app?.stop());

test("Morning + Evening share seat A-1; Full Day on it is refused", { skip }, async () => {
  const ravi = await subscribe("Ravi", "Morning", { seatId: ids.seat["A-1"] });
  assert.equal(ravi.status, 201);
  assert.equal(ravi.body.subscription.pricePaise, 80000);
  assert.equal(ravi.body.subscription.seat.label, "A-1");
  ids.sub.ravi = ravi.body.subscription.id;

  const asha = await subscribe("Asha", "Evening", { seatId: ids.seat["A-1"] });
  assert.equal(asha.status, 201);
  ids.sub.asha = asha.body.subscription.id;
  ids.ashaAllocation = asha.body.subscription.seat.allocationId;

  const kiran = await subscribe("Kiran", "Full Day", { seatId: ids.seat["A-1"] });
  assert.equal(kiran.status, 409);
  assert.equal(kiran.body.error.code, "SEAT_SLOT_TAKEN");
  assert.match(kiran.body.error.message, /Ravi.*Asha/);

  const night = (await owner.get(`/admin/availability?slotId=${ids.slot.Night}`)).body.availability;
  assert.ok(night.freeSeatIds.includes(ids.seat["A-1"]), "A-1 is still free at night");
  const fullDay = (await owner.get(`/admin/availability?slotId=${ids.slot["Full Day"]}`)).body
    .availability;
  assert.ok(!fullDay.freeSeatIds.includes(ids.seat["A-1"]));
});

test("a student can't hold two overlapping slots", { skip }, async () => {
  const overlap = await subscribe("Ravi", "Full Day", { seatId: ids.seat["A-2"] });
  assert.equal(overlap.status, 409);
  assert.equal(overlap.body.error.code, "MEMBER_SLOT_OVERLAP");
  const night = await subscribe("Ravi", "Night", { seatId: ids.seat["A-2"] });
  assert.equal(night.status, 201);
  ids.sub.raviNight = night.body.subscription.id;
});

test("five bookings racing for one seat: exactly one wins", { skip }, async () => {
  const racers = ["Kiran", "Meena", "Neha", "Om", "Pia"];
  const results = await Promise.all(
    racers.map((name) => subscribe(name, "Morning", { seatId: ids.seat["A-3"] })),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409, 409]);
  const winner = results.find((r) => r.status === 201).body.subscription;
  ids.sub.morningA3 = winner.id;
});

test(
  "the database itself refuses an overlap written behind the service's back",
  { skip },
  async () => {
    // Morning on A-1 holds cell 12 (06:00). Claiming that cell for Asha's allocation must fail.
    await assert.rejects(
      app.pool.query(
        "INSERT INTO seat_allocation_cells (seat_id, cell, tenant_id, allocation_id) VALUES (?, 12, ?, ?)",
        [ids.seat["A-1"], libraryId, ids.ashaAllocation],
      ),
      (error) => error.code === "ER_DUP_ENTRY",
    );
  },
);

test(
  "a pricier seat replaces the subscription, billed at the new price from next period",
  { skip },
  async () => {
    const moved = await owner.post(`/admin/subscriptions/${ids.sub.raviNight}/move`, {
      seatId: ids.seat["A-4"],
    });
    assert.equal(moved.status, 200);
    const next = moved.body.subscription;
    assert.notEqual(next.id, ids.sub.raviNight);
    assert.equal(next.previousSubscriptionId, ids.sub.raviNight);
    assert.equal(next.pricePaise, 60000 + 30000, "plan + AC surcharge");
    assert.equal(
      next.billsFrom,
      addMonthsToDateKey(next.startOn, 1),
      "new price from the next period",
    );
    const old = (await owner.get(`/admin/subscriptions/${ids.sub.raviNight}`)).body.subscription;
    assert.equal(old.status, "ended");
    assert.equal(old.endReason, "seat_change");

    const sameSeatPrice = await owner.post(`/admin/subscriptions/${ids.sub.asha}/move`, {
      seatId: ids.seat["A-2"],
    });
    assert.equal(sameSeatPrice.body.subscription.id, ids.sub.asha, "same price: same subscription");
    assert.equal(sameSeatPrice.body.subscription.seat.label, "A-2");
  },
);

test("changing slot checks the seat and starts a new subscription", { skip }, async () => {
  const clash = await owner.post(`/admin/subscriptions/${ids.sub.asha}/change-slot`, {
    slotId: ids.slot["Full Day"],
    planId: ids.plan["Full Day"],
    seatId: ids.seat["A-3"],
  });
  assert.equal(clash.status, 409, "Full Day on A-3 overlaps the Morning student there");
  const changed = await owner.post(`/admin/subscriptions/${ids.sub.asha}/change-slot`, {
    slotId: ids.slot.Night,
    planId: ids.plan.Night,
    seatId: ids.seat["A-3"],
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.subscription.slot.name, "Night");
  assert.equal(changed.body.subscription.previousSubscriptionId, ids.sub.asha);
  ids.sub.asha = changed.body.subscription.id;
});

test("two students swap seats", { skip }, async () => {
  const swapped = await owner.post("/admin/subscriptions/swap", {
    subscriptionA: ids.sub.ravi,
    subscriptionB: ids.sub.morningA3,
  });
  assert.equal(swapped.status, 200);
  const ravi = (await owner.get(`/admin/subscriptions/${ids.sub.ravi}`)).body.subscription;
  const other = (await owner.get(`/admin/subscriptions/${ids.sub.morningA3}`)).body.subscription;
  assert.equal(ravi.seat.label, "A-3");
  assert.equal(other.seat.label, "A-1");
});

test("a sit-anywhere hall fills up by how many sit at once", { skip }, async () => {
  const hall = { hallId: ids.openHall };
  assert.equal((await subscribe("Xavi", "Morning", hall)).status, 201);
  assert.equal((await subscribe("Yash", "Full Day", hall)).status, 201);
  const full = await subscribe("Zoya", "Morning", hall);
  assert.equal(full.status, 409);
  assert.equal(full.body.error.code, "HALL_SLOT_FULL");
  assert.equal(
    (await subscribe("Zoya", "Evening", hall)).status,
    201,
    "Morning student has left by then",
  );

  const availability = (await owner.get(`/admin/availability?slotId=${ids.slot.Morning}`)).body
    .availability;
  assert.deepEqual(
    availability.floatingHalls.map((h) => [h.capacity, h.used]),
    [[2, 2]],
  );
});

test("layout edits that would strand students are refused", { skip }, async () => {
  const shrink = await owner.patch(`/admin/seats/${ids.seat["F-1"]}`, { status: "disabled" });
  assert.equal(shrink.body.error.code, "IN_USE", "Open Hall needs both seats at its busiest");
  const taken = await owner.patch(`/admin/seats/${ids.seat["A-1"]}`, { status: "disabled" });
  assert.equal(taken.body.error.code, "IN_USE");
  const mode = await owner.patch(`/admin/halls/${ids.hallA}`, { seatingMode: "floating" });
  assert.equal(mode.body.error.code, "IN_USE");
  assert.equal((await owner.delete(`/admin/seats/${ids.seat["A-1"]}`)).body.error.code, "IN_USE");
});

test("slot times can change only if everyone still fits", { skip }, async () => {
  const earlier = await owner.patch(`/admin/slots/${ids.slot.Evening}`, {
    startMin: at("11:00"),
    endMin: at("18:00"),
  });
  assert.equal(earlier.status, 409);
  assert.equal(earlier.body.error.code, "SLOT_CHANGE_CONFLICT");
  const later = await owner.patch(`/admin/slots/${ids.slot.Night}`, {
    startMin: at("18:00"),
    endMin: at("23:30"),
  });
  assert.equal(later.status, 200);
  const [{ count }] = (
    await app.pool.query(
      `SELECT COUNT(*) AS count FROM seat_allocation_cells c JOIN seat_allocations a ON a.id = c.allocation_id
        WHERE a.slot_id = ? AND a.status = 'active' AND c.cell = 46`,
      [ids.slot.Night],
    )
  )[0];
  assert.ok(Number(count) > 0, "Night students now hold 23:00–23:30 too");
});

test("ending a subscription frees the seat; other libraries can't touch it", { skip }, async () => {
  const ended = await owner.post(`/admin/subscriptions/${ids.sub.ravi}/end`, { reason: "left" });
  assert.equal(ended.body.subscription.status, "ended");
  const morning = (await owner.get(`/admin/availability?slotId=${ids.slot.Morning}`)).body
    .availability;
  assert.ok(morning.freeSeatIds.includes(ids.seat["A-3"]));

  const { owner: otherOwner } = await app.createLibraryWithOwner("other-seating");
  const foreign = await otherOwner.post(`/admin/members/${ids.member.Kiran}/subscriptions`, {
    slotId: ids.slot.Morning,
    planId: ids.plan.Morning,
    seatId: ids.seat["A-3"],
  });
  assert.equal(foreign.status, 404);
  assert.equal((await otherOwner.get(`/admin/subscriptions/${ids.sub.asha}`)).status, 404);
});
