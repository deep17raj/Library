import { cellsForSlot, peakDuringSlot } from "@app/shared/slots";
import { notFound } from "../../http/AppError.js";

/**
 * For a slot: which numbered seats are free, and how full each sit-anywhere hall
 * is at its busiest moment during the slot. Feeds the seat picker.
 * @param {import("./subscriptions.service.js").SubscriptionsDeps} deps
 */
export async function getAvailability(deps, ctx, slotId) {
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
