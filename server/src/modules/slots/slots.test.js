import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeAudit, fakeDb } from "../../../testing/fakes.js";
import { createSlotsService } from "./slots.service.js";

function fakeSlotsRepository() {
  const slots = new Map();
  const plans = new Map();
  return {
    listSlots: async () => [...slots.values()],
    listPlans: async () => [...plans.values()],
    findSlot: async (db, tenantId, id) => slots.get(id) || null,
    findPlan: async (db, tenantId, id) => plans.get(id) || null,
    insertSlot: async (db, tenantId, slot) => slots.set(slot.id, { status: "active", ...slot }),
    updateSlot: async (db, tenantId, id, patch) => Object.assign(slots.get(id), patch),
    insertPlan: async (db, tenantId, plan) => plans.set(plan.id, { status: "active", ...plan }),
    updatePlan: async (db, tenantId, id, patch) => Object.assign(plans.get(id), patch),
  };
}

function setup() {
  const rescheduled = [];
  const service = createSlotsService({
    db: fakeDb(),
    repo: fakeSlotsRepository(),
    audit: fakeAudit(),
    rescheduleSlot: async (tx, ctx, slot, times) => rescheduled.push({ slot: slot.name, times }),
  });
  const ctx = { tenantId: "lib", actor: { id: "owner" } };
  return { service, ctx, rescheduled };
}

const MORNING = { name: "Morning", startMin: 360, endMin: 720, monthlyFeePaise: 80000 };

test("a new slot comes with its default Monthly plan at the given fee", async () => {
  const { service, ctx } = setup();
  const [slot] = await service.createSlot(ctx, MORNING);
  assert.equal(slot.monthlyFeePaise, 80000);
  assert.deepEqual(
    slot.plans.map((p) => [p.name, p.periodUnit, p.periodCount, p.isDefault]),
    [["Monthly", "month", 1, true]],
  );
});

test("only a real change of times re-checks the students holding the slot", async () => {
  const { service, ctx, rescheduled } = setup();
  const [slot] = await service.createSlot(ctx, MORNING);
  await service.updateSlot(ctx, slot.id, { name: "Early" });
  await service.updateSlot(ctx, slot.id, { startMin: 360, endMin: 720 });
  assert.equal(rescheduled.length, 0);
  await service.updateSlot(ctx, slot.id, { startMin: 360, endMin: 780 });
  assert.deepEqual(rescheduled, [{ slot: "Early", times: { startMin: 360, endMin: 780 } }]);
});

test("the default plan can't be archived; extra plans can", async () => {
  const { service, ctx } = setup();
  const [slot] = await service.createSlot(ctx, MORNING);
  const monthly = slot.plans[0];
  await assert.rejects(service.updatePlan(ctx, monthly.id, { status: "archived" }), {
    status: 422,
  });

  const [withQuarterly] = await service.createPlan(ctx, slot.id, {
    name: "Quarterly",
    periodUnit: "month",
    periodCount: 3,
    pricePaise: 220000,
  });
  const quarterly = withQuarterly.plans.find((p) => p.name === "Quarterly");
  const [after] = await service.updatePlan(ctx, quarterly.id, { status: "archived" });
  assert.equal(after.plans.find((p) => p.id === quarterly.id).status, "archived");
});
