import { ERROR_CODES, SEATING_MODES } from "@app/shared/constants";
import { cellsForSlot } from "@app/shared/slots";
import { conflict } from "../../http/AppError.js";
import { isDuplicateKey } from "../../db/transaction.js";
import { hallHasRoom, memberOverlaps, seatConflicts } from "./placementRules.js";

/** @typedef {import("./subscriptions.service.js").SubscriptionsDeps} Deps */

/**
 * A slot's times are changing. Everyone holding it moves to the new times together,
 * so check that the new times still fit every seat, every student's other slots and
 * every sit-anywhere hall — then move their seat cells. Runs inside the slot
 * update's transaction (the slot row is already locked).
 * @param {Deps} deps
 * @param {{ id: string, name: string }} slot
 * @param {{ startMin: number, endMin: number }} times
 */
export async function rescheduleSlot(deps, tx, ctx, slot, times) {
  const moved = { ...slot, ...times };
  const holders = await deps.subs.listActiveSubscriptionsOfSlot(tx, ctx.tenantId, slot.id);
  const movingIds = new Set(holders.map((holder) => holder.subscriptionId));
  const problems = [
    ...(await seatProblems(deps, tx, ctx, holders, movingIds, moved)),
    ...(await memberProblems(deps, tx, ctx, holders, movingIds, moved)),
    ...(await hallProblems(deps, tx, ctx, holders, movingIds, moved)),
  ];
  if (problems.length > 0) {
    const shown =
      problems.slice(0, 5).join("; ") +
      (problems.length > 5 ? `; and ${problems.length - 5} more` : "");
    throw conflict(ERROR_CODES.SLOT_CHANGE_CONFLICT, `These new times don't fit: ${shown}`, {
      endMin: shown,
    });
  }
  await moveCells(deps, tx, ctx, holders, moved);
}

async function seatProblems(deps, tx, ctx, holders, movingIds, moved) {
  const problems = [];
  for (const holder of holders.filter((h) => h.seatId)) {
    const others = (
      await deps.allocations.listActiveAllocationsOnSeat(tx, ctx.tenantId, holder.seatId)
    ).filter((allocation) => !movingIds.has(allocation.subscriptionId));
    for (const clash of seatConflicts(others, moved)) {
      problems.push(
        `seat ${holder.seatLabel}: ${holder.memberName} would overlap ${clash.memberName} (${clash.slotName})`,
      );
    }
  }
  return problems;
}

async function memberProblems(deps, tx, ctx, holders, movingIds, moved) {
  const problems = [];
  for (const holder of holders) {
    const otherSlots = (
      await deps.subs.listActiveSlotsOfMember(tx, ctx.tenantId, holder.memberId)
    ).filter((held) => !movingIds.has(held.subscriptionId));
    for (const overlap of memberOverlaps(otherSlots, moved)) {
      problems.push(`${holder.memberName} also has ${overlap.slotName}`);
    }
  }
  return problems;
}

async function hallProblems(deps, tx, ctx, holders, movingIds, moved) {
  const floatingHallIds = [
    ...new Set(
      holders.filter((h) => h.seatingMode === SEATING_MODES.FLOATING).map((h) => h.hallId),
    ),
  ];
  const problems = [];
  for (const hallId of floatingHallIds) {
    const hall = await deps.allocations.findHallPlace(tx, ctx.tenantId, hallId);
    const held = await deps.subs.listActiveSlotsInHall(tx, ctx.tenantId, hallId);
    const staying = held.filter((h) => !movingIds.has(h.subscriptionId));
    const movingCount = held.length - staying.length;
    // Add the moving students one by one at the new times; each must find room.
    const after = [...staying];
    for (let index = 0; index < movingCount; index += 1) {
      if (!hallHasRoom(after, moved, Number(hall.capacity))) {
        problems.push(`${hall.hallName} would be over its ${hall.capacity} seats`);
        break;
      }
      after.push(moved);
    }
  }
  return problems;
}

async function moveCells(deps, tx, ctx, holders, moved) {
  const seated = holders.filter((holder) => holder.allocationId);
  await deps.allocations.deleteCellsOfAllocations(
    tx,
    ctx.tenantId,
    seated.map((h) => h.allocationId),
  );
  const cells = cellsForSlot(moved);
  for (const holder of seated) {
    try {
      await deps.allocations.insertCells(
        tx,
        ctx.tenantId,
        holder.seatId,
        holder.allocationId,
        cells,
      );
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      const message = `Seat ${holder.seatLabel} was just booked at the new times. Try again.`;
      throw conflict(ERROR_CODES.SLOT_CHANGE_CONFLICT, message, { endMin: message });
    }
  }
}
