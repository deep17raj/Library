import { ERROR_CODES } from "@app/shared/constants";
import { cellsForSlot, peakDuringSlot } from "@app/shared/slots";
import { AppError, notFound } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { byUser, recordAudit } from "../audit/audit.repository.js";
import * as membersRepository from "../members/members.repository.js";
import * as slotsRepository from "../slots/slots.repository.js";
import { billingSettings, libraryToday } from "../settings/libraryDate.js";
import * as allocationsRepository from "./allocations.repository.js";
import * as subscriptionsRepository from "./subscriptions.repository.js";
import { loadSlotAndPlan, startSubscription } from "./lifecycle.js";
import { lockPlace } from "./placement.js";
import { changeSlot, endSubscription, moveSubscription, swapSeats } from "./changes.js";
import { rescheduleSlot } from "./reschedule.js";

/**
 * @typedef {Object} SubscriptionsDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof subscriptionsRepository} subs
 * @property {typeof allocationsRepository} allocations
 * @property {typeof slotsRepository} slots
 * @property {typeof membersRepository} members
 * @property {{ today: typeof libraryToday, billing: typeof billingSettings }} calendar
 * @property {{ recordAudit: typeof recordAudit }} audit
 */

/** Seating students: subscriptions, seat allocations, availability. */
export function createSubscriptionsService({
  db,
  subs = subscriptionsRepository,
  allocations = allocationsRepository,
  slots = slotsRepository,
  members = membersRepository,
  calendar = { today: (tx, tenantId) => libraryToday(tx, tenantId), billing: billingSettings },
  audit = { recordAudit },
}) {
  return bindDeps(
    { db, subs, allocations, slots, members, calendar, audit },
    {
      listMemberSubscriptions: (deps, ctx, memberId) =>
        deps.subs.listMemberSubscriptions(deps.db, ctx.tenantId, memberId),
      getSubscription,
      createSubscription,
      moveSubscription,
      changeSlot,
      swapSeats,
      endSubscription,
      getAvailability,
      rescheduleSlot,
    },
  );
}

/** @param {SubscriptionsDeps} deps */
async function getSubscription(deps, ctx, id) {
  const subscription = await deps.subs.findSubscription(deps.db, ctx.tenantId, id);
  if (!subscription) throw notFound("Subscription not found");
  return subscription;
}

/** Seat a member in a slot on a plan. @param {SubscriptionsDeps} deps */
async function createSubscription(deps, ctx, memberId, input) {
  const id = await withTransaction(deps.db, async (tx) => {
    const member = await deps.members.lockMember(tx, ctx.tenantId, memberId);
    if (!member) throw notFound("Member not found");
    if (member.status !== "active") {
      throw new AppError(422, ERROR_CODES.VALIDATION_FAILED, `${member.name} is marked inactive`);
    }
    const { slot, plan } = await loadSlotAndPlan(deps, tx, ctx, input.slotId, input.planId);
    const place = await lockPlace(deps, tx, ctx, input);
    const startOn = input.startOn ?? (await deps.calendar.today(tx, ctx.tenantId));
    const { defaultCollection } = await deps.calendar.billing(tx, ctx.tenantId);
    const newId = await startSubscription(deps, tx, ctx, {
      memberId,
      slot,
      planId: plan.id,
      basePricePaise: plan.pricePaise,
      periodUnit: plan.periodUnit,
      periodCount: plan.periodCount,
      place,
      startOn,
      billsFrom: startOn,
      collection: input.collection ?? defaultCollection,
      lockerFeePaise: input.lockerFeePaise,
    });
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "subscription.create", "subscription", newId, input),
    );
    return newId;
  });
  return getSubscription(deps, ctx, id);
}

/**
 * For a slot: which numbered seats are free, and how full each sit-anywhere hall
 * is at its busiest moment during the slot. Feeds the seat picker.
 * @param {SubscriptionsDeps} deps
 */
async function getAvailability(deps, ctx, slotId) {
  const slot = await deps.slots.findSlot(deps.db, ctx.tenantId, slotId);
  if (!slot) throw notFound("Slot not found");
  const freeSeatIds = await deps.allocations.listFreeSeatIds(
    deps.db,
    ctx.tenantId,
    cellsForSlot(slot),
  );
  const halls = await deps.allocations.listFloatingHalls(deps.db, ctx.tenantId);
  const floatingHalls = await Promise.all(
    halls.map(async (hall) => {
      const held = await deps.subs.listActiveSlotsInHall(deps.db, ctx.tenantId, hall.hallId);
      const used = peakDuringSlot(held, slot);
      const capacity = Number(hall.capacity);
      return { ...hall, capacity, used, free: Math.max(0, capacity - used) };
    }),
  );
  return { slotId, freeSeatIds, floatingHalls };
}
