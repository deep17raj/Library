import crypto from "node:crypto";
import { ERROR_CODES, SEATING_MODES } from "@app/shared/constants";
import { cellsForSlot } from "@app/shared/slots";
import { AppError, notFound } from "../../http/AppError.js";
import { isDuplicateKey } from "../../db/transaction.js";
import {
  hallFullError,
  hallHasRoom,
  memberOverlapError,
  memberOverlaps,
  seatConflicts,
  seatTakenByRaceError,
  seatTakenError,
} from "./placementRules.js";

/**
 * @typedef {import("./subscriptions.service.js").SubscriptionsDeps} Deps
 * @typedef {{ kind: "seat", seatId: string, label: string, hallId: string, hallName: string,
 *   monthlySurchargePaise: number }
 * | { kind: "hall", hallId: string, hallName: string, capacity: number,
 *   monthlySurchargePaise: number }} Place
 */

const unavailable = (field, message) =>
  new AppError(422, ERROR_CODES.VALIDATION_FAILED, message, { [field]: message });

/**
 * Lock and load where a student will sit: a seat in a fixed hall, or a sit-anywhere
 * hall. Must be called inside the transaction, after the member is locked.
 * @param {Deps} deps
 * @returns {Promise<Place>}
 */
export async function lockPlace(deps, tx, ctx, { seatId, hallId }) {
  if (seatId) {
    if (!(await deps.allocations.lockSeat(tx, ctx.tenantId, seatId)))
      throw notFound("Seat not found");
    const seat = await deps.allocations.findSeatPlace(tx, ctx.tenantId, seatId);
    if (seat.seatStatus !== "active" || seat.hallStatus !== "active") {
      throw unavailable("seatId", `Seat ${seat.label} is disabled`);
    }
    if (seat.seatingMode !== SEATING_MODES.FIXED) {
      throw unavailable(
        "seatId",
        `${seat.hallName} is a sit-anywhere hall: choose the hall, not a seat`,
      );
    }
    return { kind: "seat", ...seat };
  }
  if (!(await deps.allocations.lockHall(tx, ctx.tenantId, hallId)))
    throw notFound("Hall not found");
  const hall = await deps.allocations.findHallPlace(tx, ctx.tenantId, hallId);
  if (hall.hallStatus !== "active") throw unavailable("hallId", `${hall.hallName} is disabled`);
  if (hall.seatingMode !== SEATING_MODES.FLOATING) {
    throw unavailable("hallId", `${hall.hallName} has numbered seats: choose a seat`);
  }
  return { kind: "hall", ...hall, capacity: Number(hall.capacity) };
}

/** @param {Deps} deps */
export async function assertMemberFree(deps, tx, ctx, memberId, slot) {
  const held = await deps.subs.listActiveSlotsOfMember(tx, ctx.tenantId, memberId);
  const overlaps = memberOverlaps(held, slot);
  if (overlaps.length > 0) throw memberOverlapError(overlaps);
}

/**
 * Give an (already inserted) subscription its place for `slot`. For a seat: the rule
 * check, then the allocation and its cells — the cells' primary key is the database's
 * own guard, so even a path that skipped the check can't double-book.
 * @param {Deps} deps
 * @param {{ place: Place, subscriptionId: string, memberId: string,
 *   slot: { id: string, startMin: number, endMin: number }, startOn: string }} placement
 */
export async function occupyPlace(
  deps,
  tx,
  ctx,
  { place, subscriptionId, memberId, slot, startOn },
) {
  if (place.kind === "hall") {
    const others = (await deps.subs.listActiveSlotsInHall(tx, ctx.tenantId, place.hallId)).filter(
      (held) => held.subscriptionId !== subscriptionId,
    );
    if (!hallHasRoom(others, slot, place.capacity))
      throw hallFullError(place.hallName, place.capacity);
    return;
  }
  const onSeat = await deps.allocations.listActiveAllocationsOnSeat(tx, ctx.tenantId, place.seatId);
  const conflicts = seatConflicts(onSeat, slot);
  if (conflicts.length > 0) throw seatTakenError(place.label, conflicts);

  const allocationId = crypto.randomUUID();
  await deps.allocations.insertAllocation(tx, ctx.tenantId, {
    id: allocationId,
    subscriptionId,
    memberId,
    seatId: place.seatId,
    slotId: slot.id,
    startOn,
    createdBy: ctx.actor.id,
  });
  try {
    await deps.allocations.insertCells(
      tx,
      ctx.tenantId,
      place.seatId,
      allocationId,
      cellsForSlot(slot),
    );
  } catch (error) {
    if (isDuplicateKey(error)) throw seatTakenByRaceError(place.label);
    throw error;
  }
}

/** Free a subscription's seat (sit-anywhere places need nothing freed). @param {Deps} deps */
export async function vacatePlace(deps, tx, ctx, subscription, { reason, endOn }) {
  if (!subscription.seat) return;
  await deps.allocations.endAllocation(tx, ctx.tenantId, subscription.seat.allocationId, {
    reason,
    endOn,
  });
}
