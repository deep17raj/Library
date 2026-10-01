import { SEATING_MODES } from "@app/shared/constants";
import { notFound } from "../../http/AppError.js";

/** @typedef {import("./subscriptions.service.js").SubscriptionsDeps} Deps */

/**
 * One hall as the seat map draws it: tables → seats, each seat with everyone who
 * holds it now (all slots — the screen filters by slot with shared `seatStatusForSlot`).
 * A sit-anywhere hall lists its students instead, with its capacity.
 * @param {Deps} deps
 */
export async function getSeatMap(deps, ctx, hallId) {
  const hall = await deps.layout.findHall(deps.db, ctx.tenantId, hallId);
  if (!hall) throw notFound("Hall not found");
  const [tables, seats, place] = await Promise.all([
    deps.layout.listTablesOfHall(deps.db, ctx.tenantId, hallId),
    deps.layout.listSeatsOfHall(deps.db, ctx.tenantId, hallId),
    deps.allocations.findHallPlace(deps.db, ctx.tenantId, hallId),
  ]);
  const summary = { ...hall, capacity: Number(place.capacity) };

  if (hall.seatingMode === SEATING_MODES.FLOATING) {
    const occupants = await deps.subs.listActiveOccupantsOfHall(deps.db, ctx.tenantId, hallId);
    return { hall: summary, tables: nest(tables, seats, new Map()), floatingOccupants: occupants };
  }
  const occupants = await deps.allocations.listActiveAllocationsInHall(
    deps.db,
    ctx.tenantId,
    hallId,
  );
  const bySeat = new Map();
  for (const occupant of occupants) {
    if (!bySeat.has(occupant.seatId)) bySeat.set(occupant.seatId, []);
    bySeat.get(occupant.seatId).push(occupant);
  }
  return { hall: summary, tables: nest(tables, seats, bySeat), floatingOccupants: [] };
}

function nest(tables, seats, occupantsBySeat) {
  return [...tables]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((table) => ({
      id: table.id,
      label: table.label,
      seats: seats
        .filter((seat) => seat.tableId === table.id)
        .map((seat) => ({ ...seat, occupants: occupantsBySeat.get(seat.id) || [] })),
    }));
}

/** Who sat on a seat (current and past). @param {Deps} deps */
export async function getSeatHistory(deps, ctx, seatId) {
  const seat = await deps.layout.findSeat(deps.db, ctx.tenantId, seatId);
  if (!seat) throw notFound("Seat not found");
  return { seat, history: await deps.allocations.listSeatHistory(deps.db, ctx.tenantId, seatId) };
}
