import { ERROR_CODES } from "@app/shared/constants";
import { surchargeForPeriod } from "@app/shared/billing";
import { AppError, notFound } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { byUser } from "../audit/audit.repository.js";
import {
  finishSubscription,
  loadSlotAndPlan,
  lockActiveSubscription,
  replaceSubscription,
} from "./lifecycle.js";
import { lockPlace, occupyPlace, vacatePlace } from "./placement.js";

/** @typedef {import("./subscriptions.service.js").SubscriptionsDeps} Deps */

const invalid = (field, message) =>
  new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { [field]: message });

/** Run a change + its audit row in one transaction; answer with the resulting subscription. */
async function change(deps, ctx, auditArgs, work) {
  const resultId = await withTransaction(deps.db, async (tx) => {
    const id = await work(tx);
    await deps.audit.recordAudit(tx, byUser(ctx.actor, ...auditArgs));
    return id;
  });
  return deps.subs.findSubscription(deps.db, ctx.tenantId, resultId);
}

/** Same slot and plan terms, keeping what was paid for this period, at a new place. */
function samePlanTerms(subscription, place) {
  return {
    slot: subscription.slot,
    planId: subscription.plan.id,
    basePricePaise: subscription.pricePaise - subscription.surchargePaise,
    periodUnit: subscription.periodUnit,
    periodCount: subscription.periodCount,
    place,
  };
}

/**
 * Put an existing subscription at `place`. Same price → it just moves. Different
 * category price → it is replaced and the new price starts next period (D4).
 * Returns the id of the subscription that now holds the place.
 * @param {Deps} deps
 */
async function relocate(
  deps,
  tx,
  ctx,
  subscription,
  place,
  { reason, allocationReason, skipVacate = false },
) {
  const newSurcharge = surchargeForPeriod(place.monthlySurchargePaise, subscription);
  if (newSurcharge !== subscription.surchargePaise) {
    const current = skipVacate ? { ...subscription, seat: null } : subscription;
    return replaceSubscription(deps, tx, ctx, current, {
      reason,
      allocationReason,
      newTerms: samePlanTerms(subscription, place),
    });
  }
  const today = await deps.calendar.today(tx, ctx.tenantId);
  if (!skipVacate)
    await vacatePlace(deps, tx, ctx, subscription, { reason: allocationReason, endOn: today });
  await occupyPlace(deps, tx, ctx, {
    place,
    subscriptionId: subscription.id,
    memberId: subscription.memberId,
    slot: subscription.slot,
    startOn: today,
  });
  if (place.hallId !== subscription.hall.id)
    await deps.subs.setSubscriptionHall(tx, ctx.tenantId, subscription.id, place.hallId);
  return subscription.id;
}

/** Move to another seat or sit-anywhere hall. @param {Deps} deps */
export async function moveSubscription(deps, ctx, id, target) {
  return change(deps, ctx, ["subscription.move", "subscription", id, target], async (tx) => {
    const subscription = await lockActiveSubscription(deps, tx, ctx, id);
    const already = target.seatId
      ? subscription.seat?.id === target.seatId
      : !subscription.seat && subscription.hall.id === target.hallId;
    if (already)
      throw invalid(target.seatId ? "seatId" : "hallId", "The student already sits here");
    const place = await lockPlace(deps, tx, ctx, target);
    return relocate(deps, tx, ctx, subscription, place, {
      reason: "seat_change",
      allocationReason: "seat_change",
    });
  });
}

/** New slot/plan (and place); billed at the new price from next period (D4). @param {Deps} deps */
export async function changeSlot(deps, ctx, id, { slotId, planId, ...target }) {
  return change(
    deps,
    ctx,
    ["subscription.change_slot", "subscription", id, { slotId, planId, ...target }],
    async (tx) => {
      const subscription = await lockActiveSubscription(deps, tx, ctx, id);
      const { slot, plan } = await loadSlotAndPlan(deps, tx, ctx, slotId, planId);
      const place = await lockPlace(deps, tx, ctx, target);
      return replaceSubscription(deps, tx, ctx, subscription, {
        reason: "slot_change",
        allocationReason: "slot_change",
        newTerms: {
          slot,
          planId: plan.id,
          basePricePaise: plan.pricePaise,
          periodUnit: plan.periodUnit,
          periodCount: plan.periodCount,
          place,
        },
      });
    },
  );
}

/**
 * Two students on numbered seats trade seats. Members are locked in id order, then
 * seats in id order, so two swaps can never wait on each other forever.
 * @param {Deps} deps
 */
export async function swapSeats(deps, ctx, { subscriptionA, subscriptionB }) {
  return change(
    deps,
    ctx,
    ["subscription.swap", "subscription", subscriptionA, { subscriptionB }],
    async (tx) => {
      const [a, b] = await lockPair(deps, tx, ctx, subscriptionA, subscriptionB);
      const [firstSeat, secondSeat] = [a.seat.id, b.seat.id].sort();
      const placeOf = { [firstSeat]: await lockPlace(deps, tx, ctx, { seatId: firstSeat }) };
      placeOf[secondSeat] = await lockPlace(deps, tx, ctx, { seatId: secondSeat });

      // Free both seats first, so each student can take the other's.
      const today = await deps.calendar.today(tx, ctx.tenantId);
      await vacatePlace(deps, tx, ctx, a, { reason: "swap", endOn: today });
      await vacatePlace(deps, tx, ctx, b, { reason: "swap", endOn: today });
      const options = { reason: "seat_change", allocationReason: "swap", skipVacate: true };
      const newA = await relocate(deps, tx, ctx, a, placeOf[b.seat.id], options);
      await relocate(deps, tx, ctx, b, placeOf[a.seat.id], options);
      return newA;
    },
  );
}

async function lockPair(deps, tx, ctx, idA, idB) {
  const [first, second] = await Promise.all(
    [idA, idB].map((id) => deps.subs.findSubscription(tx, ctx.tenantId, id)),
  );
  if (!first || !second) throw notFound("Subscription not found");
  for (const memberId of [...new Set([first.memberId, second.memberId])].sort()) {
    await deps.members.lockMember(tx, ctx.tenantId, memberId);
  }
  const fresh = await Promise.all(
    [idA, idB].map((id) => deps.subs.findSubscription(tx, ctx.tenantId, id)),
  );
  if (fresh.some((s) => s.status !== "active"))
    throw invalid("subscriptionB", "Both students must have an active seat");
  if (fresh.some((s) => !s.seat))
    throw invalid("subscriptionB", "Only numbered seats can be swapped");
  if (fresh[0].seat.id === fresh[1].seat.id)
    throw invalid("subscriptionB", "Both students already share this seat");
  return fresh;
}

/** Release the seat now: the student left, or the library ended it. @param {Deps} deps */
export async function endSubscription(deps, ctx, id, { reason }) {
  return change(deps, ctx, ["subscription.end", "subscription", id, { reason }], async (tx) => {
    const subscription = await lockActiveSubscription(deps, tx, ctx, id);
    const today = await deps.calendar.today(tx, ctx.tenantId);
    const allocationReason = reason === "left" ? "left" : "released";
    await finishSubscription(deps, tx, ctx, subscription, {
      reason,
      allocationReason,
      endOn: today,
    });
    return id;
  });
}
