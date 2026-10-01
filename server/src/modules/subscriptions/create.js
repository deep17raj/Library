import { ERROR_CODES } from "@app/shared/constants";
import { AppError, notFound } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { byUser } from "../audit/audit.repository.js";
import { loadSlotAndPlan, startSubscription } from "./lifecycle.js";
import { lockPlace } from "./placement.js";

/** @typedef {import("./subscriptions.service.js").SubscriptionsDeps} Deps */

/**
 * Seat a member in a slot on a plan, inside the caller's transaction — so adding a
 * member with their bookings (members module) is all-or-nothing.
 * @param {Deps} deps
 * @param {{ slotId: string, planId: string, seatId?: string, hallId?: string,
 *   startOn?: string, collection?: "advance" | "arrears", lockerFeePaise?: number }} input
 * @returns {Promise<string>} the new subscription id
 */
export async function seatMember(deps, tx, ctx, memberId, input) {
  const member = await deps.members.lockMember(tx, ctx.tenantId, memberId);
  if (!member) throw notFound("Member not found");
  if (member.status !== "active") {
    throw new AppError(422, ERROR_CODES.VALIDATION_FAILED, `${member.name} is marked inactive`);
  }
  const { slot, plan } = await loadSlotAndPlan(deps, tx, ctx, input.slotId, input.planId);
  const place = await lockPlace(deps, tx, ctx, input);
  const startOn = input.startOn ?? (await deps.calendar.today(tx, ctx.tenantId));
  const { defaultCollection } = await deps.calendar.billing(tx, ctx.tenantId);
  const id = await startSubscription(deps, tx, ctx, {
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
    lockerFeePaise: input.lockerFeePaise ?? 0,
  });
  await deps.audit.recordAudit(
    tx,
    byUser(ctx.actor, "subscription.create", "subscription", id, input),
  );
  return id;
}

/** Seat an existing member (its own transaction). @param {Deps} deps */
export async function createSubscription(deps, ctx, memberId, input) {
  const id = await withTransaction(deps.db, (tx) => seatMember(deps, tx, ctx, memberId, input));
  return deps.subs.findSubscription(deps.db, ctx.tenantId, id);
}
