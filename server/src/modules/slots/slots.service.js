import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError, conflict, notFound } from "../../http/AppError.js";
import { isDuplicateKey, withTransaction } from "../../db/transaction.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { byUser, recordAudit } from "../audit/audit.repository.js";
import * as slotsRepository from "./slots.repository.js";

/**
 * @typedef {Object} SlotsDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof slotsRepository} repo
 * @property {{ recordAudit: typeof recordAudit }} audit
 * @property {(tx: any, ctx: any, slot: object, times: { startMin: number, endMin: number }) => Promise<void>} rescheduleSlot
 *   from the subscriptions module: re-checks and re-writes seat cells when a slot's times change
 */

/** Time slots (Morning 06:00–12:00…) and their plans (the prices). */
export function createSlotsService({
  db,
  rescheduleSlot,
  repo = slotsRepository,
  audit = { recordAudit },
}) {
  return bindDeps(
    { db, repo, audit, rescheduleSlot },
    { listSlots, createSlot, updateSlot, createPlan, updatePlan },
  );
}

/** Slots with their plans; `monthlyFeePaise` is the default plan's price. @param {SlotsDeps} deps */
async function listSlots(deps, ctx) {
  const [slots, plans] = await Promise.all([
    deps.repo.listSlots(deps.db, ctx.tenantId),
    deps.repo.listPlans(deps.db, ctx.tenantId),
  ]);
  return slots.map((slot) => {
    const own = plans.filter((plan) => plan.slotId === slot.id);
    return {
      ...slot,
      monthlyFeePaise: own.find((plan) => plan.isDefault)?.pricePaise ?? null,
      plans: own,
    };
  });
}

const nameTaken = () =>
  conflict(ERROR_CODES.NAME_TAKEN, "A slot with this name already exists", {
    name: "Already used",
  });

async function inTransactionWithAudit(deps, ctx, auditArgs, work) {
  try {
    await withTransaction(deps.db, async (tx) => {
      await work(tx);
      await deps.audit.recordAudit(tx, byUser(ctx.actor, ...auditArgs));
    });
  } catch (error) {
    if (isDuplicateKey(error, "uq_slots_name")) throw nameTaken();
    throw error;
  }
}

/** A slot always starts with a default "Monthly" plan at the fee given. @param {SlotsDeps} deps */
async function createSlot(deps, ctx, { monthlyFeePaise, ...input }) {
  const existing = await deps.repo.listSlots(deps.db, ctx.tenantId);
  const slot = { id: crypto.randomUUID(), ...input, sortOrder: existing.length };
  const plan = {
    id: crypto.randomUUID(),
    slotId: slot.id,
    name: "Monthly",
    periodUnit: "month",
    periodCount: 1,
    pricePaise: monthlyFeePaise,
    isDefault: true,
  };
  await inTransactionWithAudit(
    deps,
    ctx,
    ["slot.create", "slot", slot.id, { ...input, monthlyFeePaise }],
    async (tx) => {
      await deps.repo.insertSlot(tx, ctx.tenantId, slot);
      await deps.repo.insertPlan(tx, ctx.tenantId, plan);
    },
  );
  return listSlots(deps, ctx);
}

/**
 * Renaming or archiving is simple. New times must still fit every seat already
 * given out in this slot — the subscriptions module checks and moves the seat cells
 * in the same transaction, or refuses with the clashes.
 * @param {SlotsDeps} deps
 */
async function updateSlot(deps, ctx, id, patch) {
  await inTransactionWithAudit(deps, ctx, ["slot.update", "slot", id, patch], async (tx) => {
    const slot = await deps.repo.findSlot(tx, ctx.tenantId, id, { forUpdate: true });
    if (!slot) throw notFound("Slot not found");
    const timesChange =
      patch.startMin !== undefined &&
      (patch.startMin !== slot.startMin || patch.endMin !== slot.endMin);
    if (timesChange)
      await deps.rescheduleSlot(tx, ctx, slot, { startMin: patch.startMin, endMin: patch.endMin });
    await deps.repo.updateSlot(tx, ctx.tenantId, id, patch);
  });
  return listSlots(deps, ctx);
}

/** @param {SlotsDeps} deps */
async function createPlan(deps, ctx, slotId, input) {
  const slot = await deps.repo.findSlot(deps.db, ctx.tenantId, slotId);
  if (!slot) throw notFound("Slot not found");
  const plan = { id: crypto.randomUUID(), slotId, ...input, isDefault: false };
  await inTransactionWithAudit(deps, ctx, ["plan.create", "plan", plan.id, input], (tx) =>
    deps.repo.insertPlan(tx, ctx.tenantId, plan),
  );
  return listSlots(deps, ctx);
}

/**
 * Price edits apply to new subscriptions only (each subscription keeps its copy).
 * The default plan is the slot's monthly fee and can't be archived.
 * @param {SlotsDeps} deps
 */
async function updatePlan(deps, ctx, id, patch) {
  const plan = await deps.repo.findPlan(deps.db, ctx.tenantId, id);
  if (!plan) throw notFound("Plan not found");
  if (plan.isDefault && patch.status === "archived") {
    const message = "The monthly plan is the slot's fee; archive the slot instead";
    throw new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { status: message });
  }
  await inTransactionWithAudit(deps, ctx, ["plan.update", "plan", id, patch], (tx) =>
    deps.repo.updatePlan(tx, ctx.tenantId, id, patch),
  );
  return listSlots(deps, ctx);
}
