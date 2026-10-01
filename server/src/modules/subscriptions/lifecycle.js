import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { nextPeriodStart, subscriptionPrice } from "@app/shared/billing";
import { AppError, conflict, notFound } from "../../http/AppError.js";
import { assertMemberFree, occupyPlace, vacatePlace } from "./placement.js";

/** @typedef {import("./subscriptions.service.js").SubscriptionsDeps} Deps */

const invalid = (field, message) =>
  new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { [field]: message });

/** The slot and plan a subscription is for: both active, the plan belonging to the slot. @param {Deps} deps */
export async function loadSlotAndPlan(deps, tx, ctx, slotId, planId) {
  // Shared lock: a slot's times can't change while someone is being seated in it.
  const slot = await deps.slots.findSlot(tx, ctx.tenantId, slotId, { forShare: true });
  if (!slot) throw notFound("Slot not found");
  if (slot.status !== "active") throw invalid("slotId", `${slot.name} is archived`);
  const plan = await deps.slots.findPlan(tx, ctx.tenantId, planId);
  if (!plan || plan.slotId !== slot.id) throw invalid("planId", `Choose a plan of ${slot.name}`);
  if (plan.status !== "active") throw invalid("planId", `The ${plan.name} plan is archived`);
  return { slot, plan };
}

/** Lock the member, then read the subscription fresh: it must still be active. @param {Deps} deps */
export async function lockActiveSubscription(deps, tx, ctx, id) {
  const first = await deps.subs.findSubscription(tx, ctx.tenantId, id);
  if (!first) throw notFound("Subscription not found");
  await deps.members.lockMember(tx, ctx.tenantId, first.memberId);
  const subscription = await deps.subs.findSubscription(tx, ctx.tenantId, id);
  if (subscription.status !== "active") {
    throw conflict(ERROR_CODES.CONFLICT, "This subscription has already ended");
  }
  return subscription;
}

/**
 * Insert a subscription and seat it. The price is the base price plus the place's
 * category surcharge, copied onto the row.
 * @param {Deps} deps
 * @param {{ memberId: string, slot: { id: string, startMin: number, endMin: number },
 *   planId: string, basePricePaise: number, periodUnit: "month" | "day", periodCount: number,
 *   place: import("./placement.js").Place, startOn: string, billsFrom: string,
 *   collection: "advance" | "arrears", lockerFeePaise: number, previousSubscriptionId?: string }} terms
 * @returns {Promise<string>} the new subscription id
 */
export async function startSubscription(deps, tx, ctx, terms) {
  await assertMemberFree(deps, tx, ctx, terms.memberId, terms.slot);
  const { pricePaise, surchargePaise } = subscriptionPrice(
    {
      pricePaise: terms.basePricePaise,
      periodUnit: terms.periodUnit,
      periodCount: terms.periodCount,
    },
    terms.place.monthlySurchargePaise,
  );
  const id = crypto.randomUUID();
  await deps.subs.insertSubscription(tx, ctx.tenantId, {
    ...terms,
    id,
    slotId: terms.slot.id,
    hallId: terms.place.hallId,
    pricePaise,
    surchargePaise,
  });
  await occupyPlace(deps, tx, ctx, {
    place: terms.place,
    subscriptionId: id,
    memberId: terms.memberId,
    slot: terms.slot,
    startOn: terms.startOn,
  });
  return id;
}

/** End a subscription today and free its seat. @param {Deps} deps */
export async function finishSubscription(
  deps,
  tx,
  ctx,
  subscription,
  { reason, allocationReason, endOn },
) {
  await vacatePlace(deps, tx, ctx, subscription, { reason: allocationReason, endOn });
  await deps.subs.markSubscriptionEnded(tx, ctx.tenantId, subscription.id, { endOn, reason });
}

/**
 * Replace a subscription mid-period (new slot, or a seat at a different price):
 * the old one ends today, the new one holds its place from today but is billed from
 * the old one's next period — no proration (decision D4).
 * @param {Deps} deps
 */
export async function replaceSubscription(
  deps,
  tx,
  ctx,
  old,
  { reason, allocationReason, newTerms },
) {
  const today = await deps.calendar.today(tx, ctx.tenantId);
  const { anchor } = await deps.calendar.billing(tx, ctx.tenantId);
  const billsFrom = nextPeriodStart({ ...old, anchor }, today);
  await finishSubscription(deps, tx, ctx, old, { reason, allocationReason, endOn: today });
  return startSubscription(deps, tx, ctx, {
    memberId: old.memberId,
    collection: old.collection,
    lockerFeePaise: old.lockerFeePaise,
    previousSubscriptionId: old.id,
    startOn: today,
    billsFrom,
    ...newTerms,
  });
}
