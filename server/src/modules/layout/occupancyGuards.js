import { ERROR_CODES, SEATING_MODES } from "@app/shared/constants";
import { peakOccupancy } from "@app/shared/slots";
import { conflict } from "../../http/AppError.js";

// Layout edits that would strand students are refused: you can't disable or delete
// a seat someone holds, shrink a sit-anywhere hall below its busiest moment, or
// change/disable a hall that has active students.

/**
 * @typedef {Object} Occupancy  from the subscriptions module's repositories
 * @property {(db: any, tenantId: string, seatId: string) => Promise<number>} countActiveAllocationsOnSeat
 * @property {(db: any, tenantId: string, hallId: string) => Promise<{ startMin: number, endMin: number }[]>} listActiveSlotsInHall
 * @property {(db: any, tenantId: string, hallId: string) => Promise<number>} countActiveSubscriptionsInHall
 */

const inUse = (message, field = "status") =>
  conflict(ERROR_CODES.IN_USE, message, { [field]: message });

/** @param {import("./layoutRules.js").LayoutDeps & { occupancy: Occupancy }} deps */
export async function assertHallChangeAllowed(deps, ctx, hall, patch) {
  const modeChanges = patch.seatingMode && patch.seatingMode !== hall.seatingMode;
  const disabling = patch.status === "disabled" && hall.status !== "disabled";
  if (!modeChanges && !disabling) return;
  const students = await deps.occupancy.countActiveSubscriptionsInHall(
    deps.db,
    ctx.tenantId,
    hall.id,
  );
  if (students > 0) {
    const what = modeChanges ? "change its seating" : "disable it";
    throw inUse(
      `${hall.name} has ${students} active student(s). Move them before you ${what}.`,
      modeChanges ? "seatingMode" : "status",
    );
  }
}

/**
 * Taking `seats` out of use (disable or delete) in `hall`.
 * @param {import("./layoutRules.js").LayoutDeps & { occupancy: Occupancy }} deps
 * @param {{ id: string, label: string, status: string }[]} seats
 */
export async function assertSeatsRemovable(deps, ctx, hall, seats) {
  const activeSeats = seats.filter((seat) => seat.status === "active");
  if (activeSeats.length === 0) return;
  if (hall.seatingMode === SEATING_MODES.FIXED) {
    for (const seat of activeSeats) {
      if ((await deps.occupancy.countActiveAllocationsOnSeat(deps.db, ctx.tenantId, seat.id)) > 0) {
        throw inUse(`Seat ${seat.label} is given to a student. Move them first.`);
      }
    }
    return;
  }
  const hallSeats = (await deps.repo.listTablesOfHall(deps.db, ctx.tenantId, hall.id)).map(
    (t) => t.id,
  );
  const capacity = await countActiveSeats(deps, ctx, hallSeats);
  const peak = peakOccupancy(
    await deps.occupancy.listActiveSlotsInHall(deps.db, ctx.tenantId, hall.id),
  );
  if (capacity - activeSeats.length < peak) {
    throw inUse(
      `${hall.name} has up to ${peak} students at once, so it needs at least ${peak} active seats.`,
    );
  }
}

async function countActiveSeats(deps, ctx, tableIds) {
  let count = 0;
  for (const tableId of tableIds) {
    const seats = await deps.repo.listSeatsOfTable(deps.db, ctx.tenantId, tableId);
    count += seats.filter((seat) => seat.status === "active").length;
  }
  return count;
}
