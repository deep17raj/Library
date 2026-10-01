import { notFound } from "../../http/AppError.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { recordAudit } from "../audit/audit.repository.js";
import * as layoutRepository from "../layout/layout.repository.js";
import * as membersRepository from "../members/members.repository.js";
import * as slotsRepository from "../slots/slots.repository.js";
import { billingSettings, libraryToday } from "../settings/librarySettings.js";
import * as allocationsRepository from "./allocations.repository.js";
import * as subscriptionsRepository from "./subscriptions.repository.js";
import { getAvailability } from "./availability.js";
import { changeSlot, endSubscription, moveSubscription, swapSeats } from "./changes.js";
import { createSubscription, seatMember } from "./create.js";
import { rescheduleSlot } from "./reschedule.js";
import { getSeatHistory, getSeatMap } from "./seatMap.js";

/**
 * @typedef {Object} SubscriptionsDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof subscriptionsRepository} subs
 * @property {typeof allocationsRepository} allocations
 * @property {typeof slotsRepository} slots
 * @property {typeof membersRepository} members
 * @property {typeof layoutRepository} layout
 * @property {{ today: typeof libraryToday, billing: typeof billingSettings }} calendar
 * @property {{ recordAudit: typeof recordAudit }} audit
 */

/**
 * Seating students: subscriptions, seat allocations, availability, seat map.
 * `seatMember` and `rescheduleSlot` take the caller's transaction; the members and
 * slots modules use them so their own changes stay all-or-nothing.
 */
export function createSubscriptionsService({
  db,
  subs = subscriptionsRepository,
  allocations = allocationsRepository,
  slots = slotsRepository,
  members = membersRepository,
  layout = layoutRepository,
  calendar = { today: (tx, tenantId) => libraryToday(tx, tenantId), billing: billingSettings },
  audit = { recordAudit },
}) {
  return bindDeps(
    { db, subs, allocations, slots, members, layout, calendar, audit },
    {
      listMemberSubscriptions: (deps, ctx, memberId) =>
        deps.subs.listMemberSubscriptions(deps.db, ctx.tenantId, memberId),
      getSubscription,
      createSubscription,
      seatMember,
      moveSubscription,
      changeSlot,
      swapSeats,
      endSubscription,
      getAvailability,
      getSeatMap,
      getSeatHistory,
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
